import { Server as HttpServer } from 'http'
import { Server, Socket } from 'socket.io'
import cookie from 'cookie'
import { logger } from '../config/logger'
import { appConfig } from '../config/env'
import { redis } from '../config/redis'
import jwt from 'jsonwebtoken'
import { User } from '../models/user.model'
import { matchingService } from './matching.service'
import { moderationService } from './moderation.service'

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

      socket.on('find_match', (data) => this.handleFindMatch(socket, data))
      socket.on('chat_message', (data) => this.handleChatMessage(socket, data))
      socket.on('typing', () => this.handleTyping(socket))
      socket.on('webrtc_signal', (data) => this.handleWebRTCSignal(socket, data))
      socket.on('end_call', () => this.handleEndCall(socket))
      socket.on('report_user', (data) => this.handleReportUser(socket, data))
      socket.on('disconnect', () => this.handleDisconnect(socket))
    })
  }

  private async handleFindMatch(socket: AuthenticatedSocket, data: { preferredGender?: 'male' | 'female' | 'both' }) {
    if (!socket.userId) return

    try {
      // Remove user from any existing queue/match
      matchingService.removeUserFromQueue(socket.userId)
      const otherUserId = matchingService.removeUserFromMatch(socket.userId)
      if (otherUserId) {
        // Notify other user that match ended
        this.notifyUserByUserId(otherUserId, 'match_ended', { reason: 'partner_left' })
      }

      // Try to find a match with gender preferences
      const match = await matchingService.addUserToQueue(
        socket.userId, 
        socket.id, 
        data?.preferredGender
      )

      if (match) {
        // Match found! Store match ID on both sockets
        socket.matchId = match.matchId
        
        // Get the other user's socket
        const otherUserSocket = this.getSocketByUserId(match.user2.userId)
        if (otherUserSocket) {
          otherUserSocket.matchId = match.matchId
        }

        // Notify both users about the match
        socket.emit('match_found', {
          matchId: match.matchId,
          partner: {
            id: match.user2.user._id,
            name: match.user2.user.name,
          },
          isInitiator: true,
        })

        this.notifyUserByUserId(match.user2.userId, 'match_found', {
          matchId: match.matchId,
          partner: {
            id: match.user1.user._id,
            name: match.user1.user.name,
          },
          isInitiator: false,
        })

        logger.info(`Match created: ${match.matchId}`)
      } else {
        // No match found, user added to waiting queue
        socket.emit('searching', {
          message: 'Looking for someone to chat with...',
          queueStats: matchingService.getQueueStats(),
        })
      }
    } catch (error) {
      logger.error('Error in handleFindMatch:', error)
      socket.emit('match_error', { message: 'Failed to find a match. Please try again.' })
    }
  }

  private handleChatMessage(socket: AuthenticatedSocket, data: { message: string }) {
    if (!socket.userId || !socket.matchId) return

    const match = matchingService.getMatch(socket.matchId)
    if (!match) return

    // Clean the message
    const cleanedMessage = moderationService.cleanMessage(data.message)

    // Determine the other user
    const otherUserId = match.user1.userId === socket.userId ? match.user2.userId : match.user1.userId
    
    // Send message to the other user
    this.notifyUserByUserId(otherUserId, 'chat_message', {
      message: cleanedMessage,
      sender: 'stranger',
      timestamp: new Date().toISOString(),
    })
  }

  private handleTyping(socket: AuthenticatedSocket) {
    if (!socket.userId || !socket.matchId) return

    const match = matchingService.getMatch(socket.matchId)
    if (!match) return

    // Determine the other user
    const otherUserId = match.user1.userId === socket.userId ? match.user2.userId : match.user1.userId
    
    // Send typing indicator to the other user
    this.notifyUserByUserId(otherUserId, 'typing', {})
  }

  private handleWebRTCSignal(socket: AuthenticatedSocket, signalData: any) {
    if (!socket.userId || !socket.matchId) return

    const match = matchingService.getMatch(socket.matchId)
    if (!match) return

    // Determine the other user
    const otherUserId = match.user1.userId === socket.userId ? match.user2.userId : match.user1.userId
    
    // Forward WebRTC signal to the other user
    this.notifyUserByUserId(otherUserId, 'webrtc_signal', signalData)
  }

  private handleReportUser(socket: AuthenticatedSocket, data: { reason: string; description?: string }) {
    if (!socket.userId || !socket.matchId) return

    const match = matchingService.getMatch(socket.matchId)
    if (!match) return

    const reportedUserId = match.user1.userId === socket.userId ? match.user2.userId : match.user1.userId
    
    // Log the report (in a real app, you'd store this in the database)
    logger.warn(`User ${socket.userId} reported user ${reportedUserId}: ${data.reason}`)
    
    // End the match
    this.handleEndCall(socket)
    
    socket.emit('report_submitted', { message: 'Report submitted successfully' })
  }

  private handleEndCall(socket: AuthenticatedSocket) {
    if (!socket.userId) return

    // Remove user from queue if they're waiting
    matchingService.removeUserFromQueue(socket.userId)
    
    // Remove user from active match and get partner ID
    const otherUserId = matchingService.removeUserFromMatch(socket.userId)
    
    if (otherUserId) {
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

    // Handle the disconnect the same way as ending a call
    this.handleEndCall(socket)
    
    logger.info(`User disconnected: ${socket.userId}`)
  }

  private getSocketByUserId(userId: string): AuthenticatedSocket | undefined {
    for (const [socketId, socket] of this.io.sockets.sockets) {
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
      waitingUsers: matchingService.getUsersInQueue(),
      activeMatches: matchingService.getActiveMatches(),
      queueStats: matchingService.getQueueStats(),
    }
  }
}
