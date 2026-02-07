import { Server as HttpServer } from 'http'
import { Server, Socket } from 'socket.io'
// import { createAdapter } from '@socket.io/redis-adapter'
import { createRequire } from 'module';
const requireModule = createRequire(__filename);
const cookie = requireModule('cookie');
import { logger } from '../config/logger'
import { appConfig } from '../config/env'
import jwt from 'jsonwebtoken'
import { User } from '../models/user.model'
import { advancedMatchingService, MatchingPreferences } from './advanced-matching.service'
// import { distributedMatchingService } from './distributed-matching.service'
// import { moderationService } from './moderation.service'
import { aiModerationService } from './ai-moderation.service'
import { metricsService } from './metrics.service'
import { subscriptionService } from './subscription.service'
import { notificationService } from './notification.service'
import { cacheService, CACHE_CONFIGS } from './cache.service'
import { getWebRTCConfig, evaluateConnectionQuality } from '../config/webrtc'
import { redis } from '../config/redis'
import { directConnectionService } from './direct-connection.service'

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
  private reconnectingUsers: Set<string> = new Set() // Track users currently reconnecting

  constructor(server: HttpServer) {
    // console.log('appConfig.cors.origin', appConfig.cors.origin);
    const socketCorsOrigins = Array.isArray(appConfig.cors.origin)
  ? appConfig.cors.origin
  : [appConfig.cors.origin]
    this.io = new Server(server, {
      cors: {
        // origin: appConfig.cors.origin,
        origin: (origin, callback) => {
          // Allow server-to-server / Postman / health checks
          if (!origin) return callback(null, true)
          if (socketCorsOrigins.includes(origin)) {
            return callback(null, true)
          }
          callback(new Error(`Socket.IO CORS blocked: ${origin}`))
        },
        credentials: true,
        methods: ['GET', 'POST'],
      },
      transports: ["websocket", "polling"],
      pingTimeout: SOCKET_CONFIG.pingTimeout,
      pingInterval: SOCKET_CONFIG.pingInterval,
      perMessageDeflate: SOCKET_CONFIG.perMessageDeflate,
      maxHttpBufferSize: SOCKET_CONFIG.maxHttpBufferSize,
      // Enable automatic reconnection handling
      allowRequest: (req, callback) => {
        // Add CORS headers for Socket.IO
        callback(null, true);
      }
    })

    // Set up notification service socket emitter
    notificationService.setSocketEmitter((userId, event, data) => {
      this.notifyUserByUserId(userId, event, data);
    });

    this.setupMiddleware()
    this.setupEventHandlers()
    this.setupRedisSubscriptions()

    // Start periodic cleanup to remove stale connections
    this.startPeriodicCleanup(30000); // Run every 30 seconds
  }

  private setupMiddleware() {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        // First try to get token from auth object (from frontend)
        let token = socket.handshake.auth.token;

        // If no token in auth, try cookies
        if (!token && socket.handshake.headers.cookie) {
          try {
            const cookies = cookie.parse(socket.handshake.headers.cookie);
            token = cookies.accessToken || cookies.refreshToken;
          } catch (cookieError) {
            logger.error('Error parsing cookies:', cookieError);
          }
        }

        if (!token) {
          logger.warn('Socket connection rejected: No token provided', {
            hasAuthToken: !!socket.handshake.auth.token,
            hasCookies: !!socket.handshake.headers.cookie
          });
          return next(new Error('Authentication error: No token provided'));
        }

        // Verify token
        let decoded;
        try {
          decoded = jwt.verify(token, appConfig.jwt.secret) as { id: string };
        } catch (jwtError) {
          logger.error('JWT verification failed:', jwtError);
          if (jwtError instanceof jwt.TokenExpiredError) {
            logger.warn('JWT token expired');
            return next(new Error('TokenExpired'));
          }
          return next(new Error('Authentication error: Invalid token'));
        }

        // Look up user
        const user = await cacheService.getOrSet(
          decoded.id,
          async () => User.findById(decoded.id),
          CACHE_CONFIGS.USER
        );

        if (!user) {
          logger.warn('Socket connection rejected: User not found', { userId: decoded.id });
          return next(new Error('User not found'));
        }

        socket.userId = user._id || user.id;
        logger.info(`Socket authenticated successfully: ${socket.userId}`);
        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication error'));
      }
    });
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

      // Handle potential reconnection
      if (socket.userId && this.reconnectingUsers.has(socket.userId)) {
        this.reconnectingUsers.delete(socket.userId);
        logger.info(`User reconnected: ${socket.userId}`);
      }

      // Track user connection
      if (socket.userId) {
        // Store userId -> socketId mapping for quick lookups
        this.userSocketMap.set(socket.userId, socket.id)

        // Track in metrics
        metricsService.trackUserConnection(socket.userId)

        // Track online status in Redis for distributed systems
        this.addUserToOnlineSet(socket.userId).catch(err => {
          logger.error('Error tracking online user:', err)
        })

        // Send welcome notification for new users
        socket.emit('connected', {
          userId: socket.userId,
          timestamp: Date.now()
        })

        // Send current stats
        this.sendStatsToUser(socket)

        // Broadcast updated online count to all users
        this.broadcastOnlineCount()
      }

      // Set up disconnect handler with reconnection tracking
      socket.on('disconnect', () => this.handleDisconnect(socket))

      socket.on('find_match', (data) => this.handleFindMatch(socket, data))
      socket.on('chat_message', (data) => this.handleChatMessage(socket, data))
      socket.on('typing', () => this.handleTyping(socket))
      socket.on('webrtc_signal', (data) => this.handleWebRTCSignal(socket, data))
      socket.on('end_call', () => this.handleEndCall(socket))
      socket.on('skip_match', (data) => this.handleSkipMatch(socket, data))
      socket.on('report_user', (data) => this.handleReportUser(socket, data))
      socket.on('connection_quality', (data) => this.handleConnectionQuality(socket, data))
      socket.on('get_webrtc_config', () => this.handleGetWebRTCConfig(socket))
      socket.on('get_notifications', () => this.handleGetNotifications(socket))
      socket.on('mark_notification_read', (data) => this.handleMarkNotificationRead(socket, data))

      // Direct connection events
      socket.on('register_online', (data) => this.handleRegisterOnline(socket, data))
      socket.on('send_connection_request', (data) => this.handleSendConnectionRequest(socket, data))
      socket.on('accept_connection_request', (data) => this.handleAcceptConnectionRequest(socket, data))
      socket.on('reject_connection_request', (data) => this.handleRejectConnectionRequest(socket, data))
      socket.on('cancel_connection_request', (data) => this.handleCancelConnectionRequest(socket, data))
      socket.on('start_direct_call', (data) => this.handleStartDirectCall(socket, data))
      socket.on('heartbeat_online', () => this.handleHeartbeatOnline(socket))

      // Handle reconnection attempts
      socket.on('error', (error) => {
        logger.error(`Socket error for user ${socket.userId}:`, error);
        if (socket.userId) {
          this.handleDisconnect(socket);
        }
      });
    })
  }

  /**
   * Add user to online set with proper error handling
   */
  private async addUserToOnlineSet(userId: string): Promise<void> {
    try {
      // First check if user is already marked online to avoid duplicates
      const isOnline = await cacheService.sismember('online_users', userId);
      if (!isOnline) {
        await cacheService.sadd('online_users', userId, CACHE_CONFIGS.USER_ONLINE);
      }
    } catch (error) {
      logger.error(`Error adding user to online set: ${error}`);
      // Fallback: try to add anyway
      await cacheService.sadd('online_users', userId, CACHE_CONFIGS.USER_ONLINE).catch(() => {});
    }
  }

  /**
   * Remove user from online set with proper error handling
   */
  private async removeUserFromOnlineSet(userId: string): Promise<void> {
    try {
      await cacheService.srem('online_users', userId, CACHE_CONFIGS.USER_ONLINE);
    } catch (error) {
      logger.error(`Error removing user from online set:`, error);
      // Fallback: try to remove anyway
      await cacheService.srem('online_users', userId, CACHE_CONFIGS.USER_ONLINE).catch(() => {});
    }
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
        console.log('Match found:', match.user1.userId, " and ", match.user2.userId);
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
        console.log('No match found, user added to queue:', socket.userId);
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

  private handleSkipMatch(socket: AuthenticatedSocket, data: { matchId: string }) {
    if (!socket.userId || !data.matchId) return

    logger.info(`User ${socket.userId} is skipping match ${data.matchId}`)

    // Get the current match
    const match = advancedMatchingService.getMatch(data.matchId)
    if (!match) {
      socket.emit('skip_error', { message: 'Match not found' })
      return
    }

    // Determine the other user
    const otherUserId = match.user1.userId === socket.userId ? match.user2.userId : match.user1.userId

    // Track match ended due to skip
    metricsService.trackMatchEnded()

    // Remove the match
    advancedMatchingService.removeUserFromMatch(socket.userId)

    // Notify the other user that they were skipped
    this.notifyUserByUserId(otherUserId, 'partner_skipped', { 
      message: 'Your partner has moved on to someone else' 
    })

    // Clear match ID from both sockets
    socket.matchId = undefined
    const otherSocket = this.getSocketByUserId(otherUserId)
    if (otherSocket) {
      otherSocket.matchId = undefined
    }

    // Confirm skip to the user
    socket.emit('skip_confirmed', { message: 'Match skipped successfully' })
  }

  private handleDisconnect(socket: AuthenticatedSocket) {
    if (!socket.userId) return

    // Check if this is a manual disconnect or unexpected
    const wasConnected = this.userSocketMap.has(socket.userId);

    // Remove from user socket map
    this.userSocketMap.delete(socket.userId)

    // Track disconnection in metrics
    metricsService.trackUserDisconnection(socket.userId)

    // Remove from online users in Redis
    this.removeUserFromOnlineSet(socket.userId)

    // Remove from direct connections online users
    directConnectionService.removeUserOnline(socket.userId).catch(err => {
      logger.error('Error removing user from direct connections:', err)
    })

    // Handle the disconnect the same way as ending a call
    this.handleEndCall(socket)

    // Broadcast updated online count
    this.broadcastOnlineCount()

    // Broadcast direct connections online count update
    directConnectionService.getOnlineUsersCount().then(count => {
      this.io.emit('direct_online_count', { count })
    }).catch(err => {
      logger.error('Error broadcasting direct online count:', err)
    })

    logger.info(`User disconnected: ${socket.userId}, wasConnected: ${wasConnected}`)
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

  // Send stats to a specific user
  private sendStatsToUser(socket: AuthenticatedSocket) {
    const stats = this.getStats()
    socket.emit('stats_update', stats)
  }

  // Broadcast online user count to all connected clients
  private async broadcastOnlineCount() {
    try {
      const onlineCount = await this.getOnlineUsersCount()
      this.io.emit('online_count', { count: onlineCount })
    } catch (error) {
      logger.error('Error broadcasting online count:', error)
    }
  }

  // Get online users count from Redis (for distributed systems)
  public async getOnlineUsersCount(): Promise<number> {
    try {
      // First sync local connections with Redis
      const localSockets = Array.from(this.io.sockets.sockets.values());
      const localUserIds = new Set<string>();

      // Collect all currently connected user IDs from local sockets
      for (const socket of localSockets) {
        const authSocket = socket as AuthenticatedSocket;
        if (authSocket.userId) {
          localUserIds.add(authSocket.userId);
        }
      }

      // Get Redis online users
      const redisOnlineUsers = await cacheService.smembers('online_users');

      // Find users in Redis but not locally connected (stale entries)
      const staleUsers = redisOnlineUsers.filter(userId => !localUserIds.has(userId));

      // Remove stale entries
      for (const userId of staleUsers) {
        await this.removeUserFromOnlineSet(userId);
        logger.debug(`Removed stale online user: ${userId}`);
      }

      // Return accurate count
      return localUserIds.size;
    } catch (error) {
      logger.error('Error getting online users count:', error);
      // Fallback to local count
      return this.io.sockets.sockets.size;
    }
  }

  // Periodic cleanup of stale connections
  public startPeriodicCleanup(intervalMs: number = 60000): NodeJS.Timeout {
    return setInterval(async () => {
      try {
        const accurateCount = await this.getOnlineUsersCount();
        logger.debug(`Online users cleanup: ${accurateCount} users`);

        // Broadcast the corrected count
        this.io.emit('online_count', { count: accurateCount });
      } catch (error) {
        logger.error('Error during periodic cleanup:', error);
      }
    }, intervalMs);
  }

  // ==================== DIRECT CONNECTION HANDLERS ====================

  /**
   * Register user as online for direct connections
   */
  private async handleRegisterOnline(socket: AuthenticatedSocket, data: {
    name: string
    gender?: 'male' | 'female' | 'other'
    avatar?: string
    interests: string[]
    languages: string[]
    type: 'free' | 'pro'
  }) {
    if (!socket.userId) return

    try {
      // Check subscription for direct connection feature
      const actionCheck = await subscriptionService.canPerformAction(socket.userId, 'direct_connection')
      if (!actionCheck.allowed) {
        socket.emit('direct_connection_error', { message: actionCheck.reason })
        return
      }

      await directConnectionService.registerUserOnline(socket.userId, {
        name: data.name,
        gender: data.gender,
        avatar: data.avatar,
        interests: data.interests,
        languages: data.languages,
        type: data.type
      })

      socket.emit('registered_online', { success: true })
      logger.info(`User ${socket.userId} registered for direct connections`)

      // Broadcast updated online count for direct connections
      const directOnlineCount = await directConnectionService.getOnlineUsersCount()
      this.io.emit('direct_online_count', { count: directOnlineCount })
    } catch (error) {
      logger.error(`Error registering user ${socket.userId} as online:`, error)
      socket.emit('direct_connection_error', { message: 'Failed to register as online' })
    }
  }

  /**
   * Handle heartbeat for online users
   */
  private async handleHeartbeatOnline(socket: AuthenticatedSocket) {
    if (!socket.userId) return

    try {
      await directConnectionService.updateUserHeartbeat(socket.userId)
    } catch (error) {
      logger.error(`Error updating heartbeat for user ${socket.userId}:`, error)
    }
  }

  /**
   * Send connection request to another user
   */
  private async handleSendConnectionRequest(socket: AuthenticatedSocket, data: {
    toUserId: string
    message?: string
  }) {
    if (!socket.userId) return

    try {
      // Check subscription limits
      const actionCheck = await subscriptionService.canPerformAction(socket.userId, 'direct_connection')
      if (!actionCheck.allowed) {
        socket.emit('connection_request_error', { message: actionCheck.reason })
        return
      }

      // Check if target user is online
      const targetUser = await directConnectionService.getOnlineUser(data.toUserId)
      if (!targetUser) {
        socket.emit('connection_request_error', { message: 'User is not online' })
        return
      }

      // Check if already connected
      const hasConnection = await directConnectionService.hasActiveConnection(socket.userId, data.toUserId)
      if (hasConnection) {
        socket.emit('connection_request_error', { message: 'Already connected with this user' })
        return
      }

      // Create connection request
      const request = await directConnectionService.createConnectionRequest(
        socket.userId,
        data.toUserId,
        data.message
      )

      // Get sender info for notification
      const senderInfo = await directConnectionService.getOnlineUser(socket.userId)

      // Notify the target user
      this.notifyUserByUserId(data.toUserId, 'connection_request_received', {
        requestId: request.id,
        fromUser: senderInfo,
        message: data.message,
        createdAt: request.createdAt
      })

      // Confirm to sender
      socket.emit('connection_request_sent', {
        requestId: request.id,
        toUserId: data.toUserId,
        status: 'pending'
      })

      // Send notification
      await notificationService.notify(data.toUserId, 'connection_request', {
        requestId: request.id,
        fromUserId: socket.userId,
        fromUserName: senderInfo?.name || 'Someone'
      })

      logger.info(`Connection request ${request.id} sent from ${socket.userId} to ${data.toUserId}`)
    } catch (error) {
      logger.error(`Error sending connection request from ${socket.userId}:`, error)
      socket.emit('connection_request_error', {
        message: error instanceof Error ? error.message : 'Failed to send connection request'
      })
    }
  }

  /**
   * Accept a connection request
   */
  private async handleAcceptConnectionRequest(socket: AuthenticatedSocket, data: {
    requestId: string
  }) {
    if (!socket.userId) return

    try {
      const connection = await directConnectionService.acceptConnectionRequest(
        data.requestId,
        socket.userId
      )

      // Get request details to notify the sender
      const request = await directConnectionService.getConnectionRequest(data.requestId)
      if (!request) {
        throw new Error('Request not found after acceptance')
      }

      // Get WebRTC config for both users
      const webrtcConfig1 = getWebRTCConfig(request.fromUserId)
      const webrtcConfig2 = getWebRTCConfig(request.toUserId)

      // Get user info for both sides
      const fromUserInfo = await directConnectionService.getOnlineUser(request.fromUserId)
      const toUserInfo = await directConnectionService.getOnlineUser(request.toUserId)

      // Notify the request sender that their request was accepted
      this.notifyUserByUserId(request.fromUserId, 'connection_request_accepted', {
        connectionId: connection.connectionId,
        requestId: data.requestId,
        partner: toUserInfo,
        isInitiator: true,
        webrtcConfig: webrtcConfig1
      })

      // Confirm to the accepter
      socket.emit('connection_accepted', {
        connectionId: connection.connectionId,
        requestId: data.requestId,
        partner: fromUserInfo,
        isInitiator: false,
        webrtcConfig: webrtcConfig2
      })

      // Send notifications to both users
      await Promise.all([
        notificationService.notify(request.fromUserId, 'connection_accepted', {
          connectionId: connection.connectionId,
          partnerId: request.toUserId,
          partnerName: toUserInfo?.name || 'Someone'
        }),
        notificationService.notify(request.toUserId, 'connection_accepted', {
          connectionId: connection.connectionId,
          partnerId: request.fromUserId,
          partnerName: fromUserInfo?.name || 'Someone'
        })
      ])

      logger.info(`Connection request ${data.requestId} accepted, connection ${connection.connectionId} created`)
    } catch (error) {
      logger.error(`Error accepting connection request ${data.requestId}:`, error)
      socket.emit('connection_accept_error', {
        message: error instanceof Error ? error.message : 'Failed to accept connection request'
      })
    }
  }

  /**
   * Reject a connection request
   */
  private async handleRejectConnectionRequest(socket: AuthenticatedSocket, data: {
    requestId: string
  }) {
    if (!socket.userId) return

    try {
      await directConnectionService.rejectConnectionRequest(data.requestId, socket.userId)

      // Get request details to notify the sender
      const request = await directConnectionService.getConnectionRequest(data.requestId)
      if (request) {
        this.notifyUserByUserId(request.fromUserId, 'connection_request_rejected', {
          requestId: data.requestId,
          byUserId: socket.userId
        })

        // Send notification
        await notificationService.notify(request.fromUserId, 'connection_rejected', {
          requestId: data.requestId
        })
      }

      socket.emit('connection_rejected', { requestId: data.requestId })
      logger.info(`Connection request ${data.requestId} rejected by user ${socket.userId}`)
    } catch (error) {
      logger.error(`Error rejecting connection request ${data.requestId}:`, error)
      socket.emit('connection_reject_error', {
        message: error instanceof Error ? error.message : 'Failed to reject connection request'
      })
    }
  }

  /**
   * Cancel a sent connection request
   */
  private async handleCancelConnectionRequest(socket: AuthenticatedSocket, data: {
    requestId: string
  }) {
    if (!socket.userId) return

    try {
      await directConnectionService.cancelConnectionRequest(data.requestId, socket.userId)

      // Get request details to notify the target
      const request = await directConnectionService.getConnectionRequest(data.requestId)
      if (request) {
        this.notifyUserByUserId(request.toUserId, 'connection_request_cancelled', {
          requestId: data.requestId,
          byUserId: socket.userId
        })
      }

      socket.emit('connection_cancelled', { requestId: data.requestId })
      logger.info(`Connection request ${data.requestId} cancelled by user ${socket.userId}`)
    } catch (error) {
      logger.error(`Error cancelling connection request ${data.requestId}:`, error)
      socket.emit('connection_cancel_error', {
        message: error instanceof Error ? error.message : 'Failed to cancel connection request'
      })
    }
  }

  /**
   * Start direct video call between connected users
   */
  private async handleStartDirectCall(socket: AuthenticatedSocket, data: {
    connectionId: string
  }) {
    if (!socket.userId) return

    try {
      // Activate the connection
      const connection = await directConnectionService.activateConnection(data.connectionId)

      if (!connection) {
        socket.emit('direct_call_error', { message: 'Connection not found' })
        return
      }

      // Determine the other user
      const otherUserId = connection.user1Id === socket.userId ? connection.user2Id : connection.user1Id

      // Notify the other user that direct call is starting
      this.notifyUserByUserId(otherUserId, 'direct_call_starting', {
        connectionId: data.connectionId,
        byUserId: socket.userId
      })

      socket.emit('direct_call_started', { connectionId: data.connectionId })
      logger.info(`Direct call started on connection ${data.connectionId}`)
    } catch (error) {
      logger.error(`Error starting direct call for connection ${data.connectionId}:`, error)
      socket.emit('direct_call_error', {
        message: error instanceof Error ? error.message : 'Failed to start direct call'
      })
    }
  }
}
