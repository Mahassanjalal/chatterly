import { Server as HttpServer } from 'http'
import { Server, Socket } from 'socket.io'
import cookie from 'cookie'
import { logger } from '../config/logger'
import { appConfig } from '../config/env'
import jwt from 'jsonwebtoken'
import { User } from '../models/user.model'
import { advancedMatchingService, MatchingPreferences } from './advanced-matching.service'
import { moderationService } from './moderation.service'
import { aiModerationService } from './ai-moderation.service'
import { metricsService } from './metrics.service'
import { subscriptionService } from './subscription.service'
import { getWebRTCConfig, evaluateConnectionQuality, ConnectionQuality } from '../config/webrtc'

interface AuthenticatedSocket extends Socket {
  userId?: string
  matchId?: string
}

export class SocketService {
  private io: Server

  constructor(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: appConfig.cors.origin,
        methods: ['GET', 'POST'],
      },
    })

    this.setupMiddleware()
    this.setupEventHandlers()
  }

  private setupMiddleware() {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        let token = socket.handshake.auth.token
        
        if (!token && socket.handshake.headers.cookie) {
          const cookies = cookie.parse(socket.handshake.headers.cookie)
          token = cookies.token
        }

        if (!token) {
          throw new Error('Authentication error')
        }

        const decoded = jwt.verify(token, appConfig.jwt.secret) as { id: string }
        const user = await User.findById(decoded.id)

        if (!user) {
          throw new Error('User not found')
        }

        socket.userId = user.id
        next()
      } catch (error) {
        next(new Error('Authentication error'))
      }
    })
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`User connected: ${socket.userId}`)
      
      // Track user connection in metrics
      if (socket.userId) {
        metricsService.trackUserConnection(socket.userId)
      }

      socket.on('find_match', (data) => this.handleFindMatch(socket, data))
      socket.on('chat_message', (data) => this.handleChatMessage(socket, data))
      socket.on('typing', () => this.handleTyping(socket))
      socket.on('webrtc_signal', (data) => this.handleWebRTCSignal(socket, data))
      socket.on('end_call', () => this.handleEndCall(socket))
      socket.on('report_user', (data) => this.handleReportUser(socket, data))
      socket.on('connection_quality', (data) => this.handleConnectionQuality(socket, data))
      socket.on('get_webrtc_config', () => this.handleGetWebRTCConfig(socket))
      socket.on('disconnect', () => this.handleDisconnect(socket))
    })
  }

  private async handleFindMatch(socket: AuthenticatedSocket, data: { 
    preferredGender?: 'male' | 'female' | 'both';
    interests?: string[];
    region?: string;
  }) {
    if (!socket.userId) return

    const startTime = Date.now()

    try {
      // Check if user can match (premium limits)
      const actionCheck = await subscriptionService.canPerformAction(socket.userId, 'match')
      if (!actionCheck.allowed) {
        socket.emit('match_error', { message: actionCheck.reason })
        return
      }

      // Remove user from any existing queue/match
      advancedMatchingService.removeUserFromQueue(socket.userId)
      const otherUserId = advancedMatchingService.removeUserFromMatch(socket.userId)
      if (otherUserId) {
        // Notify other user that match ended
        this.notifyUserByUserId(otherUserId, 'match_ended', { reason: 'partner_left' })
        metricsService.trackMatchEnded()
      }

      // Build matching preferences
      const preferences: Partial<MatchingPreferences> = {
        gender: data?.preferredGender,
        interests: data?.interests,
        region: data?.region,
      }

      // Try to find a match with advanced algorithm
      const match = await advancedMatchingService.addUserToQueue(
        socket.userId, 
        socket.id, 
        preferences
      )

      // Update queue size metric
      metricsService.updateQueueSize(advancedMatchingService.getUsersInQueue())

      if (match) {
        // Match found! Track metrics
        const matchLatency = Date.now() - startTime
        metricsService.trackMatchCreated(matchLatency)
        
        // Store match ID on both sockets
        socket.matchId = match.matchId
        
        // Get the other user's socket
        const otherUserSocket = this.getSocketByUserId(match.user2.userId)
        if (otherUserSocket) {
          otherUserSocket.matchId = match.matchId
        }

        // Get WebRTC config for both users
        const webrtcConfig1 = getWebRTCConfig(socket.userId)
        const webrtcConfig2 = getWebRTCConfig(match.user2.userId)

        // Notify both users about the match with enhanced data
        socket.emit('match_found', {
          matchId: match.matchId,
          matchScore: match.matchScore,
          partner: {
            id: match.user2.user._id,
            name: match.user2.user.name,
          },
          isInitiator: true,
          webrtcConfig: webrtcConfig1,
        })

        this.notifyUserByUserId(match.user2.userId, 'match_found', {
          matchId: match.matchId,
          matchScore: match.matchScore,
          partner: {
            id: match.user1.user._id,
            name: match.user1.user.name,
          },
          isInitiator: false,
          webrtcConfig: webrtcConfig2,
        })

        logger.info(`Match created: ${match.matchId} (score: ${match.matchScore.toFixed(2)}, latency: ${matchLatency}ms)`)
      } else {
        // No match found, user added to waiting queue
        socket.emit('searching', {
          message: 'Looking for someone to chat with...',
          queueStats: advancedMatchingService.getQueueStats(),
        })
      }
    } catch (error) {
      logger.error('Error in handleFindMatch:', error)
      metricsService.trackError('match')
      socket.emit('match_error', { message: 'Failed to find a match. Please try again.' })
    }
  }

  private async handleChatMessage(socket: AuthenticatedSocket, data: { message: string }) {
    if (!socket.userId || !socket.matchId) return

    const match = advancedMatchingService.getMatch(socket.matchId)
    if (!match) return

    // Use AI moderation for enhanced content filtering
    const moderationResult = await aiModerationService.analyzeText(socket.userId, data.message)
    
    // Track message in metrics
    metricsService.trackMessageSent()

    // Handle moderation result
    if (moderationResult.action === 'block') {
      metricsService.trackModerationAction('block')
      socket.emit('message_blocked', {
        reason: 'Your message was blocked by our content filter.',
        categories: moderationResult.categories,
      })
      return
    }

    if (moderationResult.action === 'warn') {
      metricsService.trackModerationAction('warn')
      socket.emit('message_warning', {
        reason: 'Your message contained inappropriate content.',
        warningCount: aiModerationService.getUserWarningCount(socket.userId),
      })
    }

    // Determine the other user
    const otherUserId = match.user1.userId === socket.userId ? match.user2.userId : match.user1.userId
    
    // Send sanitized message to the other user
    this.notifyUserByUserId(otherUserId, 'chat_message', {
      message: moderationResult.sanitizedText,
      sender: 'stranger',
      timestamp: new Date().toISOString(),
    })
  }

  private handleTyping(socket: AuthenticatedSocket) {
    if (!socket.userId || !socket.matchId) return

    const match = advancedMatchingService.getMatch(socket.matchId)
    if (!match) return

    // Determine the other user
    const otherUserId = match.user1.userId === socket.userId ? match.user2.userId : match.user1.userId
    
    // Send typing indicator to the other user
    this.notifyUserByUserId(otherUserId, 'typing', {})
  }

  private handleWebRTCSignal(socket: AuthenticatedSocket, signalData: any) {
    if (!socket.userId || !socket.matchId) return

    const match = advancedMatchingService.getMatch(socket.matchId)
    if (!match) return

    // Determine the other user
    const otherUserId = match.user1.userId === socket.userId ? match.user2.userId : match.user1.userId
    
    // Forward WebRTC signal to the other user
    this.notifyUserByUserId(otherUserId, 'webrtc_signal', signalData)
  }

  private handleReportUser(socket: AuthenticatedSocket, data: { reason: string; description?: string }) {
    if (!socket.userId || !socket.matchId) return

    const match = advancedMatchingService.getMatch(socket.matchId)
    if (!match) return

    const reportedUserId = match.user1.userId === socket.userId ? match.user2.userId : match.user1.userId
    
    // Track report in metrics
    metricsService.trackReport()
    
    // Log the report (in a real app, you'd store this in the database)
    logger.warn(`User ${socket.userId} reported user ${reportedUserId}: ${data.reason}`)
    
    // End the match
    this.handleEndCall(socket)
    
    socket.emit('report_submitted', { message: 'Report submitted successfully' })
  }

  private handleEndCall(socket: AuthenticatedSocket) {
    if (!socket.userId) return

    // Remove user from queue if they're waiting
    advancedMatchingService.removeUserFromQueue(socket.userId)
    
    // Remove user from active match and get partner ID
    const otherUserId = advancedMatchingService.removeUserFromMatch(socket.userId)
    
    if (otherUserId) {
      // Track match ended
      metricsService.trackMatchEnded()
      
      // Notify the other user that the call ended
      this.notifyUserByUserId(otherUserId, 'call_ended', { reason: 'partner_left' })
      
      // Clear match ID from the other user's socket
      const otherSocket = this.getSocketByUserId(otherUserId)
      if (otherSocket) {
        otherSocket.matchId = undefined
      }
    }
    
    // Clear match ID from current socket
    socket.matchId = undefined
    
    socket.emit('call_ended', { reason: 'you_left' })
  }

  private handleDisconnect(socket: AuthenticatedSocket) {
    if (!socket.userId) return

    // Track disconnection in metrics
    metricsService.trackUserDisconnection(socket.userId)

    // Handle the disconnect the same way as ending a call
    this.handleEndCall(socket)
    
    logger.info(`User disconnected: ${socket.userId}`)
  }

  private handleConnectionQuality(socket: AuthenticatedSocket, data: { 
    bandwidth: number; 
    latency: number; 
    packetLoss: number 
  }) {
    if (!socket.userId) return

    // Evaluate connection quality
    const quality = evaluateConnectionQuality(data.bandwidth, data.latency, data.packetLoss)
    
    // Emit quality update back to client
    socket.emit('connection_quality_update', {
      quality,
      metrics: data,
    })
  }

  private async handleGetWebRTCConfig(socket: AuthenticatedSocket) {
    if (!socket.userId) return

    try {
      const config = getWebRTCConfig(socket.userId)
      const subscription = await subscriptionService.getUserSubscription(socket.userId)
      const maxQuality = subscriptionService.getMaxVideoQuality(subscription.plan)
      
      socket.emit('webrtc_config', {
        ...config,
        maxQuality,
      })
    } catch (error) {
      logger.error('Error getting WebRTC config:', error)
      socket.emit('webrtc_config_error', { message: 'Failed to get WebRTC configuration' })
    }
  }

  private getSocketByUserId(userId: string): AuthenticatedSocket | undefined {
    for (const [, socket] of this.io.sockets.sockets) {
      const authSocket = socket as AuthenticatedSocket
      if (authSocket.userId === userId) {
        return authSocket
      }
    }
    return undefined
  }

  private notifyUserByUserId(userId: string, event: string, data: any) {
    const userSocket = this.getSocketByUserId(userId)
    if (userSocket) {
      userSocket.emit(event, data)
    }
  }

  // Public method to get current stats
  public getStats() {
    return {
      connectedUsers: this.io.sockets.sockets.size,
      waitingUsers: advancedMatchingService.getUsersInQueue(),
      activeMatches: advancedMatchingService.getActiveMatches(),
      queueStats: advancedMatchingService.getQueueStats(),
    }
  }
}
