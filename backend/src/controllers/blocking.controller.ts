import { Request, Response } from 'express'
import { User } from '../models/user.model'
import { AppError } from '../middleware/error'
import { asyncHandler } from '../utils/asyncHandler'

// Block a user
export const blockUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString()
  const { userIdToBlock } = req.body

  if (!userId) {
    throw new AppError(401, 'User not authenticated')
  }

  if (!userIdToBlock) {
    throw new AppError(400, 'User ID to block is required')
  }

  if (userId === userIdToBlock) {
    throw new AppError(400, 'Cannot block yourself')
  }

  // Check if user to block exists
  const userToBlock = await User.findById(userIdToBlock)
  if (!userToBlock) {
    throw new AppError(404, 'User to block not found')
  }

  // Check if already blocked
  const currentUser = await User.findById(userId)
  if (!currentUser) {
    throw new AppError(404, 'User not found')
  }

  if (currentUser.blockedUsers?.includes(userIdToBlock)) {
    throw new AppError(400, 'User is already blocked')
  }

  // Add to blocked users
  await User.findByIdAndUpdate(userId, {
    $addToSet: { blockedUsers: userIdToBlock },
  })

  res.json({
    success: true,
    message: 'User blocked successfully',
  })
})

// Unblock a user
export const unblockUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id
  const { userIdToUnblock } = req.body

  if (!userIdToUnblock) {
    throw new AppError(400, 'User ID to unblock is required')
  }

  const currentUser = await User.findById(userId)
  if (!currentUser) {
    throw new AppError(404, 'User not found')
  }

  if (!currentUser.blockedUsers?.includes(userIdToUnblock)) {
    throw new AppError(400, 'User is not blocked')
  }

  // Remove from blocked users
  await User.findByIdAndUpdate(userId, {
    $pull: { blockedUsers: userIdToUnblock },
  })

  res.json({
    success: true,
    message: 'User unblocked successfully',
  })
})

// Get blocked users list
export const getBlockedUsers = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id

  const user = await User.findById(userId)
    .populate('blockedUsers', 'name email')
    .lean()

  if (!user) {
    throw new AppError(404, 'User not found')
  }

  // Get blocked user details
  const blockedUserIds = user.blockedUsers || []
  const blockedUsers = await User.find({ _id: { $in: blockedUserIds } })
    .select('_id name')
    .lean()

  res.json({
    blockedUsers: blockedUsers.map(u => ({
      id: u._id,
      name: u.name,
    })),
    count: blockedUsers.length,
  })
})

// Check if a user is blocked
export const isUserBlocked = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id
  const { checkUserId } = req.query

  if (!checkUserId) {
    throw new AppError(400, 'User ID to check is required')
  }

  const user = await User.findById(userId)
  if (!user) {
    throw new AppError(404, 'User not found')
  }

  const isBlocked = user.blockedUsers?.includes(checkUserId as string) || false

  res.json({
    isBlocked,
  })
})
