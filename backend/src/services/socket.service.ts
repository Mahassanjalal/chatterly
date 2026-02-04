import { Server as HttpServer } from 'http'
import { Server, Socket } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import cookie from 'cookie'
import { logger } from '../config/logger'
import { appConfig } from '../config/env'
import jwt from 'jsonwebtoken'
import { User } from '../models/user.model'
import { advancedMatchingService, MatchingPreferences } from './advanced-matching.service'
import { distributedMatchingService } from './distributed-matching.service'
import { moderationService } from './moderation.service'
import { aiModerationService } from './ai-moderation.service'
import { metricsService } from './metrics.service'
import { subscriptionService } from './subscription.service'
import { notificationService } from './notification.service'
import { cacheService, CACHE_CONFIGS } from './cache.service'
import { getWebRTCConfig, evaluateConnectionQuality, ConnectionQuality } from '../config/webrtc'
import { redis } from '../config/redis'

interface AuthenticatedSocket extends Socket {
  userId?: string
  matchId?: string
}

// Configuration for high-scale operation
const SOCKET_CONFIG = {
  // Ping/pong for connection health
  pingTimeout: 60000,
  pingInterval: 25000,
  // Message compression
  perMessageDeflate: {
    threshold: 1024, // Only compress messages > 1KB
  },
  // Limits
  maxHttpBufferSize: 1e6, // 1MB max message size
  // Transports preference
  transports: ['websocket', 'polling'],
};

export class SocketService {
  private io: Server
  private userSocketMap: Map<string, string> = new Map() // userId -> socketId for quick lookup

  constructor(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: appConfig.cors.origin,
        methods: ['GET', 'POST'],
      },
      ...SOCKET_CONFIG,
    })

    // Set up notification service socket emitter
    notificationService.setSocketEmitter((userId, event, data) => {
      this.notifyUserByUserId(userId, event, data);
    });

    this.setupMiddleware()
    this.setupEventHandlers()
    this.setupRedisSubscriptions()
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
        
        // Use cached user lookup for performance
        const user = await cacheService.getOrSet(
          decoded.id,
          async () => User.findById(decoded.id),
          CACHE_CONFIGS.USER
        )

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

  /**
   * Set up Redis pub/sub for distributed notifications
   */
  private async setupRedisSubscriptions() {
    try {
      // Create a duplicate connection for subscriptions
      const subscriber = redis.duplicate()
      await subscriber.connect()

      // Subscribe to notification channel
      await subscriber.subscribe('notifications:realtime', (message) => {
        try {
          const data = JSON.parse(message)
          
          if (data.broadcast) {
            // System-wide broadcast
            this.io.emit('notification', data.notification)
          } else if (data.userId) {
            // User-specific notification
            this.notifyUserByUserId(data.userId, 'notification', data.notification)
          }
        } catch (error) {
          logger.error('Error processing notification from Redis:', error)
        }
      })

      logger.info('Redis pub/sub subscriptions established')
    } catch (error) {
      logger.error('Error setting up Redis subscriptions:', error)
    }
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`User connected: ${socket.userId}`)
      
      // Track user connection
      if (socket.userId) {
        // Store userId -> socketId mapping for quick lookups
        this.userSocketMap.set(socket.userId, socket.id)
        
        // Track in metrics
        metricsService.trackUserConnection(socket.userId)
        
        // Track online status in Redis for distributed systems
        cacheService.sadd('online_users', socket.userId, CACHE_CONFIGS.USER_ONLINE).catch(err => {
          logger.error('Error tracking online user:', err)
        })

        // Send welcome notification for new users
        socket.emit('connected', { 
          userId: socket.userId,
          timestamp: Date.now()
        })
      }

      socket.on('find_match', (data) => this.handleFindMatch(socket, data))
      socket.on('chat_message', (data) => this.handleChatMessage(socket, data))
      socket.on('typing', () => this.handleTyping(socket))
      socket.on('webrtc_signal', (data) => this.handleWebRTCSignal(socket, data))
      socket.on('end_call', () => this.handleEndCall(socket))
      socket.on('report_user', (data) => this.handleReportUser(socket, data))
      socket.on('connection_quality', (data) => this.handleConnectionQuality(socket, data))
      socket.on('get_webrtc_config', () => this.handleGetWebRTCConfig(socket))
      socket.on('get_notifications', () => this.handleGetNotifications(socket))
      socket.on('mark_notification_read', (data) => this.handleMarkNotificationRead(socket, data))
      socket.on('disconnect', () => this.handleDisconnect(socket))
    })
  }

  /**
   * Handle get notifications request
   */
  private async handleGetNotifications(socket: AuthenticatedSocket) {
    if (!socket.userId) return

    try {
      const [notifications, unreadCount] = await Promise.all([
        notificationService.getUserNotifications(socket.userId, { limit: 20 }),
        notificationService.getUnreadCount(socket.userId)
      ])

      socket.emit('notifications_list', {
        notifications,
        unreadCount
      })
    } catch (error) {
      logger.error('Error getting notifications:', error)
    }
  }

  /**
   * Handle mark notification as read
   */
  private async handleMarkNotificationRead(socket: AuthenticatedSocket, data: { notificationId: string }) {
    if (!socket.userId || !data.notificationId) return

    try {
      await notificationService.markAsRead(socket.userId, data.notificationId)
      const unreadCount = await notificationService.getUnreadCount(socket.userId)
      socket.emit('notification_read', { 
        notificationId: data.notificationId,
        unreadCount
      })
    } catch (error) {
      logger.error('Error marking notification as read:', error)
    }
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

        // Send in-app notifications to both users
        await Promise.all([
          notificationService.notify(socket.userId, 'match_found', {
            matchId: match.matchId,
            partnerId: match.user2.user._id,
            partnerName: match.user2.user.name,
          }),
          notificationService.notify(match.user2.userId, 'match_found', {
            matchId: match.matchId,
            partnerId: match.user1.user._id,
            partnerName: match.user1.user.name,
          }),
        ])

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
      
      // Send notification about blocked message
      await notificationService.notify(
        socket.userId, 
        'message_blocked', 
        { categories: moderationResult.categories }
      )
      return
    }

    if (moderationResult.action === 'warn') {
      metricsService.trackModerationAction('warn')
      const warningCount = aiModerationService.getUserWarningCount(socket.userId)
      socket.emit('message_warning', {
        reason: 'Your message contained inappropriate content.',
        warningCount,
      })
      
      // Send notification about warning
      await notificationService.notify(
        socket.userId,
        'message_warning',
        { warningCount },
        `Warning ${warningCount}: Please follow our community guidelines.`
      )
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

    // Remove from user socket map
    this.userSocketMap.delete(socket.userId)

    // Track disconnection in metrics
    metricsService.trackUserDisconnection(socket.userId)

    // Remove from online users in Redis
    cacheService.srem('online_users', socket.userId, CACHE_CONFIGS.USER_ONLINE).catch(err => {
      logger.error('Error removing user from online set:', err)
    })

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
    // Use the fast lookup map first
    const socketId = this.userSocketMap.get(userId)
    if (socketId) {
      const socket = this.io.sockets.sockets.get(socketId) as AuthenticatedSocket | undefined
      if (socket) return socket
    }

    // Fallback to iteration (for edge cases)
    for (const [, socket] of this.io.sockets.sockets) {
      const authSocket = socket as AuthenticatedSocket
      if (authSocket.userId === userId) {
        // Update the map for future lookups
        this.userSocketMap.set(userId, authSocket.id)
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

  // Get online users count from Redis (for distributed systems)
  public async getOnlineUsersCount(): Promise<number> {
    return cacheService.scard('online_users', CACHE_CONFIGS.USER_ONLINE)
  }
}
