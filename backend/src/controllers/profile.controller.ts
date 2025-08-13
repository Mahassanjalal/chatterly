import { Request, Response } from 'express'
import { User } from '../models/user.model'
import { AppError } from '../middleware/error'
import { asyncHandler } from '../utils/asyncHandler'
import bcrypt from 'bcryptjs'
import { logger } from '../config/logger'

// Get user profile
// Get user profile by ID
export const getUserProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user?._id).select('-password')
  if (!user) {
    throw new AppError(404, 'User not found')
  }

  res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      gender: user.gender,
      type: user.type,
      status: user.status,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  })
})

// Update user profile
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, gender } = req.body
  const userId = req.user?._id

  // Check if email is being changed and if it's already taken
  if (email) {
    const existingUser = await User.findOne({ 
      email, 
      _id: { $ne: userId } 
    })
    if (existingUser) {
      throw new AppError(409, 'Email already in use')
    }
  }

  // Update user profile
  const updateData: any = {}
  if (name) updateData.name = name
  if (email) updateData.email = email
  if (gender) updateData.gender = gender

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    updateData,
    { new: true, runValidators: true }
  ).select('-password')

  if (!updatedUser) {
    throw new AppError(404, 'User not found')
  }

  logger.info(`User profile updated: ${userId}`)

  res.json({
    message: 'Profile updated successfully',
    user: {
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      gender: updatedUser.gender,
      type: updatedUser.type,
      status: updatedUser.status,
      role: updatedUser.role,
    }
  })
})

// Change password
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body
  const userId = req.user?._id

  // Get user with password
  const user = await User.findById(userId)
  if (!user) {
    throw new AppError(404, 'User not found')
  }

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password)
  if (!isCurrentPasswordValid) {
    throw new AppError(400, 'Current password is incorrect')
  }

  // Hash new password
  const saltRounds = 12
  const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds)

  // Update password
  await User.findByIdAndUpdate(userId, { 
    password: hashedNewPassword 
  })

  logger.info(`Password changed for user: ${userId}`)

  res.json({
    message: 'Password changed successfully'
  })
})

// Upgrade to Pro
export const upgradeToPro = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id

  const user = await User.findById(userId)
  if (!user) {
    throw new AppError(404, 'User not found')
  }

  if (user.type === 'pro') {
    throw new AppError(400, 'User is already a Pro member')
  }

  // In a real application, you would:
  // 1. Process payment with Stripe/PayPal
  // 2. Verify payment success
  // 3. Then upgrade the user
  
  // For now, we'll simulate successful payment
  await User.findByIdAndUpdate(userId, { 
    type: 'pro' 
  })

  logger.info(`User upgraded to Pro: ${userId}`)

  res.json({
    message: 'Successfully upgraded to Pro membership!',
    user: {
      type: 'pro'
    }
  })
})
