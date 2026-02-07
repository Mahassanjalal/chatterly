import { logger } from '../config/logger'
import { cacheService, CACHE_CONFIGS } from './cache.service'
import { User } from '../models/user.model'

// Connection request status
export type ConnectionStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired'

// Connection request interface
export interface ConnectionRequest {
  id: string
  fromUserId: string
  toUserId: string
  status: ConnectionStatus
  message?: string
  createdAt: number
  expiresAt: number
  respondedAt?: number
}

// Online user public info (safe to expose)
export interface OnlineUserInfo {
  id: string
  name: string
  gender?: 'male' | 'female' | 'other'
  avatar?: string
  interests: string[]
  languages: string[]
  type: 'free' | 'pro'
  isOnline: boolean
  lastSeen?: number
}

// Active direct connection
export interface DirectConnection {
  connectionId: string
  user1Id: string
  user2Id: string
  status: 'pending' | 'active' | 'ended'
  startedAt?: number
  endedAt?: number
}

/**
 * Direct Connection Service
 * Manages online users discovery, connection requests, and direct video calls
 */
export class DirectConnectionService {
  private readonly CONNECTION_REQUEST_PREFIX = 'conn_req:'
  private readonly ONLINE_USER_PREFIX = 'online_user:'
  private readonly CONNECTION_PREFIX = 'direct_conn:'
  private readonly REQUEST_EXPIRY_MS = 5 * 60 * 1000 // 5 minutes
  private readonly ONLINE_USER_EXPIRY_MS = 10 * 60 * 1000 // 10 minutes

  /**
   * Register a user as online with their public info
   */
  async registerUserOnline(userId: string, userInfo: Partial<OnlineUserInfo>): Promise<void> {
    try {
      const onlineUser: OnlineUserInfo = {
        id: userId,
        name: userInfo.name || 'Anonymous',
        gender: userInfo.gender,
        avatar: userInfo.avatar,
        interests: userInfo.interests || [],
        languages: userInfo.languages || [],
        type: userInfo.type || 'free',
        isOnline: true,
        lastSeen: Date.now()
      }

      await cacheService.set(
        `${this.ONLINE_USER_PREFIX}${userId}`,
        onlineUser,
        { ttl: Math.floor(this.ONLINE_USER_EXPIRY_MS / 1000), prefix: '' }
      )

      // Add to online users set
      await cacheService.sadd('direct_online_users', userId, { ttl: Math.floor(this.ONLINE_USER_EXPIRY_MS / 1000), prefix: '' })
      
      logger.info(`User ${userId} registered as online for direct connections`)
    } catch (error) {
      logger.error(`Error registering user ${userId} as online:`, error)
      throw error
    }
  }

  /**
   * Update user's online status (heartbeat)
   */
  async updateUserHeartbeat(userId: string): Promise<void> {
    try {
      const key = `${this.ONLINE_USER_PREFIX}${userId}`
      const userData = await cacheService.get<OnlineUserInfo>(key)
      
      if (userData) {
        userData.lastSeen = Date.now()
        userData.isOnline = true
        await cacheService.set(
          key,
          userData,
          { ttl: Math.floor(this.ONLINE_USER_EXPIRY_MS / 1000), prefix: '' }
        )
      }
    } catch (error) {
      logger.error(`Error updating heartbeat for user ${userId}:`, error)
    }
  }

  /**
   * Remove user from online list
   */
  async removeUserOnline(userId: string): Promise<void> {
    try {
      await cacheService.delete(`${this.ONLINE_USER_PREFIX}${userId}`)
      await cacheService.srem('direct_online_users', userId)
      
      // Cancel any pending requests from/to this user
      await this.cancelAllPendingRequests(userId)
      
      logger.info(`User ${userId} removed from online users`)
    } catch (error) {
      logger.error(`Error removing user ${userId} from online:`, error)
    }
  }

  /**
   * Get all online users with their public info
   */
  async getOnlineUsers(excludeUserId?: string): Promise<OnlineUserInfo[]> {
    try {
      const onlineUserIds = await cacheService.smembers('direct_online_users')
      
      const users: OnlineUserInfo[] = []
      
      for (const userId of onlineUserIds) {
        if (excludeUserId && userId === excludeUserId) continue
        
        const userData = await cacheService.get<OnlineUserInfo>(`${this.ONLINE_USER_PREFIX}${userId}`)
        if (userData && userData.isOnline) {
          // Check if user is still within expiry
          const lastSeen = userData.lastSeen || 0
          if (Date.now() - lastSeen < this.ONLINE_USER_EXPIRY_MS) {
            users.push(userData)
          }
        }
      }

      return users.sort((a, b) => {
        // Pro users first, then by last seen
        if (a.type === 'pro' && b.type !== 'pro') return -1
        if (a.type !== 'pro' && b.type === 'pro') return 1
        return (b.lastSeen || 0) - (a.lastSeen || 0)
      })
    } catch (error) {
      logger.error('Error getting online users:', error)
      return []
    }
  }

  /**
   * Get specific online user info
   */
  async getOnlineUser(userId: string): Promise<OnlineUserInfo | null> {
    try {
      const userData = await cacheService.get<OnlineUserInfo>(`${this.ONLINE_USER_PREFIX}${userId}`)
      return userData || null
    } catch (error) {
      logger.error(`Error getting online user ${userId}:`, error)
      return null
    }
  }

  /**
   * Create a connection request
   */
  async createConnectionRequest(
    fromUserId: string,
    toUserId: string,
    message?: string
  ): Promise<ConnectionRequest> {
    try {
      // Check if users are blocked
      const fromUser = await User.findById(fromUserId)
      if (fromUser?.blockedUsers?.includes(toUserId)) {
        throw new Error('You have blocked this user')
      }

      const toUser = await User.findById(toUserId)
      if (toUser?.blockedUsers?.includes(fromUserId)) {
        throw new Error('This user has blocked you')
      }

      // Check if there's already a pending request
      const existingRequest = await this.getPendingRequestBetweenUsers(fromUserId, toUserId)
      if (existingRequest) {
        throw new Error('Connection request already pending')
      }

      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const request: ConnectionRequest = {
        id: requestId,
        fromUserId,
        toUserId,
        status: 'pending',
        message,
        createdAt: Date.now(),
        expiresAt: Date.now() + this.REQUEST_EXPIRY_MS
      }

      // Store request
      await cacheService.set(
        `${this.CONNECTION_REQUEST_PREFIX}${requestId}`,
        request,
        {
          ttl: Math.floor(this.REQUEST_EXPIRY_MS / 1000),
          prefix: ''
        }
      )

      // Add to user's pending requests sets
      await cacheService.sadd(`user_requests:${fromUserId}:sent`, requestId)
      await cacheService.sadd(`user_requests:${toUserId}:received`, requestId)

      logger.info(`Connection request created: ${requestId} from ${fromUserId} to ${toUserId}`)
      return request
    } catch (error) {
      logger.error('Error creating connection request:', error)
      throw error
    }
  }

  /**
   * Get a specific connection request
   */
  async getConnectionRequest(requestId: string): Promise<ConnectionRequest | null> {
    try {
      const request = await cacheService.get<ConnectionRequest>(`${this.CONNECTION_REQUEST_PREFIX}${requestId}`)
      
      if (request && request.status === 'pending' && Date.now() > request.expiresAt) {
        // Request has expired
        request.status = 'expired'
        await cacheService.set(
          `${this.CONNECTION_REQUEST_PREFIX}${requestId}`,
          request,
          { ttl: 3600, prefix: '' } // Keep expired request for 1 hour
        )
      }
      
      return request
    } catch (error) {
      logger.error(`Error getting connection request ${requestId}:`, error)
      return null
    }
  }

  /**
   * Get pending request between two users (if any)
   */
  async getPendingRequestBetweenUsers(user1Id: string, user2Id: string): Promise<ConnectionRequest | null> {
    try {
      const user1Sent = await cacheService.smembers(`user_requests:${user1Id}:sent`)
      
      for (const requestId of user1Sent) {
        const request = await this.getConnectionRequest(requestId)
        if (request && request.toUserId === user2Id && request.status === 'pending') {
          return request
        }
      }

      const user2Sent = await cacheService.smembers(`user_requests:${user2Id}:sent`)
      
      for (const requestId of user2Sent) {
        const request = await this.getConnectionRequest(requestId)
        if (request && request.toUserId === user1Id && request.status === 'pending') {
          return request
        }
      }

      return null
    } catch (error) {
      logger.error('Error getting pending request between users:', error)
      return null
    }
  }

  /**
   * Get all connection requests for a user
   */
  async getUserConnectionRequests(userId: string): Promise<{
    sent: ConnectionRequest[]
    received: ConnectionRequest[]
  }> {
    try {
      const sentIds = await cacheService.smembers(`user_requests:${userId}:sent`)
      const receivedIds = await cacheService.smembers(`user_requests:${userId}:received`)

      const sent: ConnectionRequest[] = []
      const received: ConnectionRequest[] = []

      for (const requestId of sentIds) {
        const request = await this.getConnectionRequest(requestId)
        if (request) {
          sent.push(request)
        }
      }

      for (const requestId of receivedIds) {
        const request = await this.getConnectionRequest(requestId)
        if (request) {
          received.push(request)
        }
      }

      // Sort by created date (newest first)
      sent.sort((a, b) => b.createdAt - a.createdAt)
      received.sort((a, b) => b.createdAt - a.createdAt)

      return { sent, received }
    } catch (error) {
      logger.error(`Error getting connection requests for user ${userId}:`, error)
      return { sent: [], received: [] }
    }
  }

  /**
   * Accept a connection request
   */
  async acceptConnectionRequest(requestId: string, userId: string): Promise<DirectConnection> {
    try {
      const request = await this.getConnectionRequest(requestId)
      
      if (!request) {
        throw new Error('Connection request not found')
      }

      if (request.toUserId !== userId) {
        throw new Error('Not authorized to accept this request')
      }

      if (request.status !== 'pending') {
        throw new Error(`Request is already ${request.status}`)
      }

      if (Date.now() > request.expiresAt) {
        request.status = 'expired'
        await cacheService.set(
          `${this.CONNECTION_REQUEST_PREFIX}${requestId}`,
          request,
          { ttl: 3600, prefix: '' }
        )
        throw new Error('Connection request has expired')
      }

      // Update request status
      request.status = 'accepted'
      request.respondedAt = Date.now()
      await cacheService.set(
        `${this.CONNECTION_REQUEST_PREFIX}${requestId}`,
        request,
        { ttl: 86400, prefix: '' } // Keep for 24 hours
      )

      // Create direct connection
      const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const connection: DirectConnection = {
        connectionId,
        user1Id: request.fromUserId,
        user2Id: request.toUserId,
        status: 'pending',
        startedAt: Date.now()
      }

      await cacheService.set(
        `${this.CONNECTION_PREFIX}${connectionId}`,
        connection,
        { ttl: 3600, prefix: '' } // 1 hour expiry for pending connections
      )

      // Add to users' active connections
      await cacheService.sadd(`user_connections:${request.fromUserId}`, connectionId)
      await cacheService.sadd(`user_connections:${request.toUserId}`, connectionId)

      logger.info(`Connection request ${requestId} accepted, connection ${connectionId} created`)
      return connection
    } catch (error) {
      logger.error(`Error accepting connection request ${requestId}:`, error)
      throw error
    }
  }

  /**
   * Reject a connection request
   */
  async rejectConnectionRequest(requestId: string, userId: string): Promise<void> {
    try {
      const request = await this.getConnectionRequest(requestId)
      
      if (!request) {
        throw new Error('Connection request not found')
      }

      if (request.toUserId !== userId) {
        throw new Error('Not authorized to reject this request')
      }

      if (request.status !== 'pending') {
        throw new Error(`Request is already ${request.status}`)
      }

      request.status = 'rejected'
      request.respondedAt = Date.now()
      await cacheService.set(
        `${this.CONNECTION_REQUEST_PREFIX}${requestId}`,
        request,
        { ttl: 86400, prefix: '' }
      )

      logger.info(`Connection request ${requestId} rejected by user ${userId}`)
    } catch (error) {
      logger.error(`Error rejecting connection request ${requestId}:`, error)
      throw error
    }
  }

  /**
   * Cancel a sent connection request
   */
  async cancelConnectionRequest(requestId: string, userId: string): Promise<void> {
    try {
      const request = await this.getConnectionRequest(requestId)
      
      if (!request) {
        throw new Error('Connection request not found')
      }

      if (request.fromUserId !== userId) {
        throw new Error('Not authorized to cancel this request')
      }

      if (request.status !== 'pending') {
        throw new Error(`Request is already ${request.status}`)
      }

      request.status = 'cancelled'
      request.respondedAt = Date.now()
      await cacheService.set(
        `${this.CONNECTION_REQUEST_PREFIX}${requestId}`,
        request,
        { ttl: 86400, prefix: '' }
      )

      logger.info(`Connection request ${requestId} cancelled by user ${userId}`)
    } catch (error) {
      logger.error(`Error cancelling connection request ${requestId}:`, error)
      throw error
    }
  }

  /**
   * Cancel all pending requests for a user
   */
  private async cancelAllPendingRequests(userId: string): Promise<void> {
    try {
      const { sent, received } = await this.getUserConnectionRequests(userId)
      
      for (const request of sent) {
        if (request.status === 'pending') {
          await this.cancelConnectionRequest(request.id, userId)
        }
      }

      for (const request of received) {
        if (request.status === 'pending') {
          request.status = 'cancelled'
          request.respondedAt = Date.now()
          await cacheService.set(
            `${this.CONNECTION_REQUEST_PREFIX}${request.id}`,
            request,
            { ttl: 86400, prefix: '' }
          )
        }
      }
    } catch (error) {
      logger.error(`Error cancelling pending requests for user ${userId}:`, error)
    }
  }

  /**
   * Activate a connection (when video call starts)
   */
  async activateConnection(connectionId: string): Promise<DirectConnection | null> {
    try {
      const connection = await cacheService.get<DirectConnection>(`${this.CONNECTION_PREFIX}${connectionId}`)
      
      if (!connection) return null

      connection.status = 'active'
      await cacheService.set(
        `${this.CONNECTION_PREFIX}${connectionId}`,
        connection,
        { ttl: 3600, prefix: '' }
      )

      logger.info(`Connection ${connectionId} activated`)
      return connection
    } catch (error) {
      logger.error(`Error activating connection ${connectionId}:`, error)
      return null
    }
  }

  /**
   * End a connection
   */
  async endConnection(connectionId: string): Promise<void> {
    try {
      const connection = await cacheService.get<DirectConnection>(`${this.CONNECTION_PREFIX}${connectionId}`)
      
      if (!connection) return

      connection.status = 'ended'
      connection.endedAt = Date.now()
      await cacheService.set(
        `${this.CONNECTION_PREFIX}${connectionId}`,
        connection,
        { ttl: 86400, prefix: '' } // Keep ended connection for 24 hours
      )

      logger.info(`Connection ${connectionId} ended`)
    } catch (error) {
      logger.error(`Error ending connection ${connectionId}:`, error)
    }
  }

  /**
   * Get user's active connection
   */
  async getUserActiveConnection(userId: string): Promise<DirectConnection | null> {
    try {
      const connectionIds = await cacheService.smembers(`user_connections:${userId}`)
      
      for (const connectionId of connectionIds) {
        const connection = await cacheService.get<DirectConnection>(`${this.CONNECTION_PREFIX}${connectionId}`)
        if (connection && (connection.status === 'pending' || connection.status === 'active')) {
          return connection
        }
      }

      return null
    } catch (error) {
      logger.error(`Error getting active connection for user ${userId}:`, error)
      return null
    }
  }

  /**
   * Check if two users have an active connection
   */
  async hasActiveConnection(user1Id: string, user2Id: string): Promise<boolean> {
    try {
      const user1Connections = await cacheService.smembers(`user_connections:${user1Id}`)
      
      for (const connectionId of user1Connections) {
        const connection = await cacheService.get<DirectConnection>(`${this.CONNECTION_PREFIX}${connectionId}`)
        if (connection && 
            (connection.status === 'pending' || connection.status === 'active') &&
            ((connection.user1Id === user1Id && connection.user2Id === user2Id) ||
             (connection.user1Id === user2Id && connection.user2Id === user1Id))) {
          return true
        }
      }

      return false
    } catch (error) {
      logger.error('Error checking active connection:', error)
      return false
    }
  }

  /**
   * Get online users count
   */
  async getOnlineUsersCount(): Promise<number> {
    try {
      return await cacheService.scard('direct_online_users')
    } catch (error) {
      logger.error('Error getting online users count:', error)
      return 0
    }
  }

  /**
   * Cleanup expired requests and stale data
   */
  async cleanup(): Promise<void> {
    try {
      // This method can be called periodically to clean up expired data
      // The cache expiry will handle most cleanup automatically
      logger.info('Direct connection service cleanup completed')
    } catch (error) {
      logger.error('Error during cleanup:', error)
    }
  }
}

// Export singleton instance
export const directConnectionService = new DirectConnectionService()
