import { Response } from 'express'
import { User } from '../models/user.model'
import { AppError } from '../middleware/error'
import { asyncHandler } from '../utils/asyncHandler'
import bcrypt from 'bcryptjs'
import { logger } from '../config/logger'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { AuthRequest } from '../middleware/auth'

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/avatars')
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, _file, cb) => {
    const authReq = req as AuthRequest
    const userId = authReq.user?._id
    const ext = path.extname(_file.originalname)
    cb(null, `${userId}-${Date.now()}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'))
    }
  }
}).single('avatar')

// Get user profile
// Get user profile by ID
export const getUserProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
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
      avatar: user.avatar,
      interests: user.interests || [],
      languages: user.languages || [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  })
})

// Update user profile
export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
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
  const updateData: Record<string, unknown> = {}
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
      avatar: updatedUser.avatar,
      interests: updatedUser.interests || [],
      languages: updatedUser.languages || [],
    }
  })
})

// Import preference limits from routes
import { PREFERENCE_LIMITS } from '../routes/profile.routes'

// Update interests and languages for matching preferences
export const updateInterestsAndLanguages = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { interests, languages } = req.body
  const userId = req.user?._id

  const updateData: Record<string, unknown> = {}
  
  if (interests !== undefined) {
    // Normalize interests (lowercase, trimmed, unique)
    updateData.interests = [...new Set(
      interests.map((i: string) => i.toLowerCase().trim()).filter((i: string) => i.length > 0)
    )].slice(0, PREFERENCE_LIMITS.maxInterests)
  }
  
  if (languages !== undefined) {
    // Normalize languages (lowercase, trimmed, unique)
    updateData.languages = [...new Set(
      languages.map((l: string) => l.toLowerCase().trim()).filter((l: string) => l.length > 0)
    )].slice(0, PREFERENCE_LIMITS.maxLanguages)
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    updateData,
    { new: true, runValidators: true }
  ).select('-password')

  if (!updatedUser) {
    throw new AppError(404, 'User not found')
  }

  logger.info(`User preferences updated: ${userId}`)

  res.json({
    message: 'Preferences updated successfully',
    interests: updatedUser.interests || [],
    languages: updatedUser.languages || [],
  })
})

// Upload avatar
export const uploadAvatar = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?._id

  // Use multer middleware
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' })
      }
      return res.status(400).json({ message: err.message })
    } else if (err) {
      return res.status(400).json({ message: err.message })
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    // Get old avatar to delete
    const user = await User.findById(userId)
    if (user?.avatar) {
      // Delete old avatar file
      const oldAvatarPath = path.join(__dirname, '../../uploads/avatars', path.basename(user.avatar))
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath)
      }
    }

    // Update user with new avatar URL
    const avatarUrl = `/uploads/avatars/${req.file.filename}`
    await User.findByIdAndUpdate(userId, { avatar: avatarUrl })

    logger.info(`Avatar uploaded for user: ${userId}`)

    res.json({
      message: 'Avatar uploaded successfully',
      avatarUrl,
    })
  })
})

// Remove avatar
export const removeAvatar = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?._id

  const user = await User.findById(userId)
  if (!user) {
    throw new AppError(404, 'User not found')
  }

  if (user.avatar) {
    // Delete avatar file
    const avatarPath = path.join(__dirname, '../../uploads/avatars', path.basename(user.avatar))
    if (fs.existsSync(avatarPath)) {
      fs.unlinkSync(avatarPath)
    }
  }

  // Update user
  await User.findByIdAndUpdate(userId, { avatar: null })

  logger.info(`Avatar removed for user: ${userId}`)

  res.json({
    message: 'Avatar removed successfully',
  })
})

// Change password
export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
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
export const upgradeToPro = asyncHandler(async (req: AuthRequest, res: Response) => {
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
