import { Router, Request, Response } from 'express'
import { auth } from '../middleware/auth'
import { directConnectionService } from '../services/direct-connection.service'
import { subscriptionService } from '../services/subscription.service'
import { logger } from '../config/logger'
import { User } from '../models/user.model'

const router = Router()

/**
 * @route   GET /api/direct-connections/online-users
 * @desc    Get all online users (excluding current user)
 * @access  Private
 */
router.get('/online-users', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    // Check subscription for direct connection feature
    const actionCheck = await subscriptionService.canPerformAction(userId+'', 'direct_connection')
    if (!actionCheck.allowed) {
      return res.status(403).json({ 
        message: actionCheck.reason || 'Direct connections not available for your plan'
      })
    }

    const users = await directConnectionService.getOnlineUsers(userId+'')
    const count = await directConnectionService.getOnlineUsersCount()

    res.json({
      success: true,
      users,
      totalCount: count
    })
  } catch (error) {
    logger.error('Error getting online users:', error)
    res.status(500).json({ message: 'Failed to get online users' })
  }
})

/**
 * @route   GET /api/direct-connections/requests
 * @desc    Get all connection requests for the current user
 * @access  Private
 */
router.get('/requests', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const { sent, received } = await directConnectionService.getUserConnectionRequests(userId+'')

    // Enrich requests with user info
    const enrichRequests = async (requests: any[]) => {
      const enriched = await Promise.all(
        requests.map(async (request) => {
          const otherUserId = request.fromUserId === userId ? request.toUserId : request.fromUserId
          const user = await User.findById(otherUserId).select('name avatar gender')
          return {
            ...request,
            otherUser: user ? {
              id: user._id,
              name: user.name,
              avatar: user.avatar,
              gender: user.gender
            } : null
          }
        })
      )
      return enriched
    }

    res.json({
      success: true,
      sent: await enrichRequests(sent),
      received: await enrichRequests(received)
    })
  } catch (error) {
    logger.error('Error getting connection requests:', error)
    res.status(500).json({ message: 'Failed to get connection requests' })
  }
})

/**
 * @route   GET /api/direct-connections/requests/:requestId
 * @desc    Get a specific connection request
 * @access  Private
 */
router.get('/requests/:requestId', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const { requestId } = req.params
    const request = await directConnectionService.getConnectionRequest(requestId)

    if (!request) {
      return res.status(404).json({ message: 'Connection request not found' })
    }

    // Check if user is part of this request
    if (request.fromUserId !== userId && request.toUserId !== userId) {
      return res.status(403).json({ message: 'Not authorized to view this request' })
    }

    // Get other user info
    const otherUserId = request.fromUserId === userId ? request.toUserId : request.fromUserId
    const user = await User.findById(otherUserId).select('name avatar gender interests')

    res.json({
      success: true,
      request: {
        ...request,
        otherUser: user ? {
          id: user._id,
          name: user.name,
          avatar: user.avatar,
          gender: user.gender,
          interests: user.interests
        } : null
      }
    })
  } catch (error) {
    logger.error('Error getting connection request:', error)
    res.status(500).json({ message: 'Failed to get connection request' })
  }
})

/**
 * @route   GET /api/direct-connections/active
 * @desc    Get user's active direct connection
 * @access  Private
 */
router.get('/active', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const connection = await directConnectionService.getUserActiveConnection(userId+'')

    if (!connection) {
      return res.json({
        success: true,
        connection: null
      })
    }

    // Get other user info
    const otherUserId = connection.user1Id === userId ? connection.user2Id : connection.user1Id
    const user = await User.findById(otherUserId).select('name avatar gender')

    res.json({
      success: true,
      connection: {
        ...connection,
        otherUser: user ? {
          id: user._id,
          name: user.name,
          avatar: user.avatar,
          gender: user.gender
        } : null
      }
    })
  } catch (error) {
    logger.error('Error getting active connection:', error)
    res.status(500).json({ message: 'Failed to get active connection' })
  }
})

/**
 * @route   GET /api/direct-connections/check/:userId
 * @desc    Check if user has active connection with another user
 * @access  Private
 */
router.get('/check/:userId', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id
    const targetUserId = req.params.userId
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const hasConnection = await directConnectionService.hasActiveConnection(userId+'', targetUserId)
    const pendingRequest = await directConnectionService.getPendingRequestBetweenUsers(userId+'', targetUserId)

    res.json({
      success: true,
      hasActiveConnection: hasConnection,
      pendingRequest: pendingRequest ? {
        id: pendingRequest.id,
        status: pendingRequest.status,
        fromUserId: pendingRequest.fromUserId,
        toUserId: pendingRequest.toUserId
      } : null
    })
  } catch (error) {
    logger.error('Error checking connection status:', error)
    res.status(500).json({ message: 'Failed to check connection status' })
  }
})

/**
 * @route   GET /api/direct-connections/stats
 * @desc    Get direct connections stats
 * @access  Private
 */
router.get('/stats', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const onlineCount = await directConnectionService.getOnlineUsersCount()
    const { sent, received } = await directConnectionService.getUserConnectionRequests(userId+'')

    const pendingReceived = received.filter(r => r.status === 'pending').length
    const pendingSent = sent.filter(r => r.status === 'pending').length

    res.json({
      success: true,
      stats: {
        onlineUsers: onlineCount,
        pendingReceived,
        pendingSent,
        totalRequests: sent.length + received.length
      }
    })
  } catch (error) {
    logger.error('Error getting direct connections stats:', error)
    res.status(500).json({ message: 'Failed to get stats' })
  }
})

export default router
