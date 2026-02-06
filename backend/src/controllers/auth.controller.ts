import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'
import { User, userSchema } from '../models/user.model'
import { appConfig } from '../config/env'
import { AppError } from '../middleware/error'
import { asyncHandler } from '../utils/asyncHandler'
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.service'

// Extend Request type to include user
declare module 'express' {
  interface Request {
    user?: {
      _id: string;
      [key: string]: unknown;
    };
  }
}

// Account lockout configuration
const LOCKOUT_CONFIG = {
  maxAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  attemptResetTime: 60 * 60 * 1000, // 1 hour - reset attempts after this time
};

// Refresh token configuration
const REFRESH_TOKEN_CONFIG = {
  expiresIn: 30 * 24 * 60 * 60 * 1000, // 30 days
  maxTokensPerUser: 5, // Maximum refresh tokens per user (for multiple devices)
};

/**
 * Generate a cryptographically secure refresh token
 */
const generateRefreshToken = (): string => {
  return crypto.randomBytes(40).toString('hex');
};

/**
 * Generate an access token (JWT)
 */
const generateAccessToken = (userId: string): string => {
  return jwt.sign({ id: userId }, appConfig.jwt.secret, {
    expiresIn: '15m' // Short-lived access token
  });
};

/**
 * Send token response with both access and refresh tokens
 */
const sendTokenResponse = async (user: { _id: string; name: string; email: string; gender?: string; type: string }, statusCode: number, res: Response) => {
  const accessToken = generateAccessToken(user._id.toString())
  const refreshToken = generateRefreshToken()

  // Store refresh token in database
  const dbUser = await User.findById(user._id)
  if (dbUser) {
    // Initialize security object if not exists
    if (!dbUser.security) {
      dbUser.security = {
        failedLoginAttempts: 0,
        refreshTokens: []
      }
    }
    
    // Limit refresh tokens per user
    if (dbUser.security.refreshTokens.length >= REFRESH_TOKEN_CONFIG.maxTokensPerUser) {
      // Remove oldest token
      dbUser.security.refreshTokens.shift()
    }
    
    // Add new refresh token
    dbUser.security.refreshTokens.push(refreshToken)
    await dbUser.save()
  }

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
  }

  res.status(statusCode).cookie('accessToken', accessToken, {
      ...cookieOptions,
      expires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    }).cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      expires: new Date(Date.now() + REFRESH_TOKEN_CONFIG.expiresIn), // 30 days
    }).json({
      token: accessToken, // Include token in response for socket authentication
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        gender: user.gender,
        type: user.type,
      },
    })
}

/**
 * Check if account is locked
 */
const isAccountLocked = (user: { security?: { lockoutUntil?: Date } }): boolean => {
  if (user.security?.lockoutUntil) {
    if (new Date(user.security.lockoutUntil) > new Date()) {
      return true
    }
  }
  return false
}

/**
 * Get remaining lockout time in seconds
 */
const getRemainingLockoutTime = (user: { security?: { lockoutUntil?: Date } }): number => {
  if (user.security?.lockoutUntil) {
    const remaining = new Date(user.security.lockoutUntil).getTime() - Date.now()
    return Math.ceil(Math.max(0, remaining) / 1000)
  }
  return 0
}

/**
 * Handle failed login attempt
 */
const handleFailedLogin = async (user: { _id: string; security?: { failedLoginAttempts?: number; lastFailedLogin?: Date; lockoutUntil?: Date } }): Promise<void> => {
  const dbUser = await User.findById(user._id)
  if (!dbUser) return

  // Initialize security object if not exists
  if (!dbUser.security) {
    dbUser.security = {
      failedLoginAttempts: 0,
      refreshTokens: []
    }
  }

  // Reset attempts if last failed login was more than attemptResetTime ago
  if (dbUser.security.lastFailedLogin) {
    const timeSinceLastFailure = Date.now() - new Date(dbUser.security.lastFailedLogin).getTime()
    if (timeSinceLastFailure > LOCKOUT_CONFIG.attemptResetTime) {
      dbUser.security.failedLoginAttempts = 0
    }
  }

  dbUser.security.failedLoginAttempts = (dbUser.security.failedLoginAttempts || 0) + 1
  dbUser.security.lastFailedLogin = new Date()

  // Lock account if max attempts exceeded
  if (dbUser.security.failedLoginAttempts >= LOCKOUT_CONFIG.maxAttempts) {
    dbUser.security.lockoutUntil = new Date(Date.now() + LOCKOUT_CONFIG.lockoutDuration)
  }

  await dbUser.save()
}

/**
 * Reset failed login attempts on successful login
 */
const resetFailedAttempts = async (userId: string): Promise<void> => {
  await User.findByIdAndUpdate(userId, {
    'security.failedLoginAttempts': 0,
    'security.lastFailedLogin': null,
    'security.lockoutUntil': null,
  })
}

export const signup = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, gender, type, dateOfBirth } = await userSchema.parseAsync(req.body)

  const existingUser = await User.findOne({ email })
  if (existingUser) {
    throw new AppError(409, 'Email already registered')
  }

  // Generate email verification token
  const verificationToken = uuidv4()
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  const user = new User({ 
    name, 
    email, 
    password,
    gender,
    dateOfBirth,
    type: type || 'free',
    emailVerificationToken: verificationToken,
    emailVerificationExpires: verificationExpires,
    security: {
      failedLoginAttempts: 0,
      refreshTokens: []
    }
  })
  await user.save()

  // Send verification email (don't block response)
  sendVerificationEmail(email, name, verificationToken).catch(err => {
    console.error('Failed to send verification email:', err)
  })

  await sendTokenResponse(user, 201, res)
})

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body

  const user = await User.findOne({ email })
  
  // Check if account is locked
  if (user && isAccountLocked(user)) {
    const remainingTime = getRemainingLockoutTime(user)
    const timeMessage = remainingTime < 60 
      ? `${remainingTime} seconds`
      : `${Math.ceil(remainingTime / 60)} minutes`
    throw new AppError(423, `Account is locked. Try again in ${timeMessage}.`)
  }
  
  if (!user || !(await user.comparePassword(password))) {
    // Track failed login attempt
    if (user) {
      await handleFailedLogin(user)
    }
    throw new AppError(401, 'Invalid credentials')
  }

  // Reset failed attempts on successful login
  await resetFailedAttempts(user._id.toString())

  await sendTokenResponse(user, 200, res)
})

export const logout = asyncHandler(async (req: Request, res: Response) => {
  // Get refresh token from cookies
  const refreshToken = req.cookies.refreshToken
  
  // Remove refresh token from database if present
  if (refreshToken && req.user?._id) {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { 'security.refreshTokens': refreshToken }
    })
  }
  
  res.cookie('accessToken', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  })
  res.cookie('refreshToken', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  })

  res.status(200).json({
    success: true,
    message: 'User logged out',
  })
})

// Refresh token endpoint - implements token rotation
export const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
  const oldRefreshToken = req.cookies.refreshToken

  if (!oldRefreshToken) {
    throw new AppError(401, 'No refresh token provided')
  }

  // Find user with this refresh token
  const user = await User.findOne({
    'security.refreshTokens': oldRefreshToken
  })

  if (!user) {
    // Token not found - this could indicate:
    // 1. Token was already rotated (legitimate request with old token)
    // 2. Token was never valid
    // 3. Token theft attempt where attacker is reusing a rotated token
    // 
    // We can't clear tokens here since we don't know which user,
    // but the client should re-authenticate
    throw new AppError(401, 'Invalid or expired refresh token. Please login again.')
  }

  // Remove old refresh token (rotation)
  user.security.refreshTokens = user.security.refreshTokens.filter(
    (token: string) => token !== oldRefreshToken
  )

  // Generate new tokens
  const newAccessToken = generateAccessToken(user._id.toString())
  const newRefreshToken = generateRefreshToken()

  // Limit refresh tokens per user
  if (user.security.refreshTokens.length >= REFRESH_TOKEN_CONFIG.maxTokensPerUser) {
    user.security.refreshTokens.shift()
  }
  
  user.security.refreshTokens.push(newRefreshToken)
  await user.save()

  const cookieOptions = {
    httpOnly: true,
    secure: appConfig.isProduction,
    sameSite: 'lax' as const,
  }

  res
    .status(200)
    .cookie('accessToken', newAccessToken, {
      ...cookieOptions,
      expires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    })
    .cookie('refreshToken', newRefreshToken, {
      ...cookieOptions,
      expires: new Date(Date.now() + REFRESH_TOKEN_CONFIG.expiresIn), // 30 days
    })
    .json({
      success: true,
      message: 'Token refreshed successfully',
    })
})

// Logout from all devices
export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?._id) {
    throw new AppError(401, 'Not authenticated')
  }

  // Clear all refresh tokens
  await User.findByIdAndUpdate(req.user._id, {
    'security.refreshTokens': []
  })

  res.cookie('accessToken', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  })
  res.cookie('refreshToken', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  })

  res.status(200).json({
    success: true,
    message: 'Logged out from all devices',
  })
})

export const me = asyncHandler(async (req: Request, res: Response) => {
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
      role: user.role,
      avatar: user.avatar,
      interests: user.interests || [],
      languages: user.languages || [],
      isEmailVerified: user.flags?.isEmailVerified || false,
    }
  })
})

// Verify email
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body

  if (!token) {
    throw new AppError(400, 'Verification token is required')
  }

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: new Date() },
  })

  if (!user) {
    throw new AppError(400, 'Invalid or expired verification token')
  }

  // Update user
  user.flags.isEmailVerified = true
  user.emailVerificationToken = undefined
  user.emailVerificationExpires = undefined
  await user.save()

  res.json({
    success: true,
    message: 'Email verified successfully',
  })
})

// Resend verification email
export const resendVerificationEmail = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user?._id)
  
  if (!user) {
    throw new AppError(404, 'User not found')
  }

  if (user.flags?.isEmailVerified) {
    throw new AppError(400, 'Email is already verified')
  }

  // Generate new verification token
  const verificationToken = uuidv4()
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  user.emailVerificationToken = verificationToken
  user.emailVerificationExpires = verificationExpires
  await user.save()

  // Send verification email
  await sendVerificationEmail(user.email, user.name, verificationToken)

  res.json({
    success: true,
    message: 'Verification email sent',
  })
})

// Forgot password - send reset email
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body

  if (!email) {
    throw new AppError(400, 'Email is required')
  }

  const user = await User.findOne({ email: email.toLowerCase() })

  // Always return success to prevent email enumeration
  if (!user) {
    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent',
    })
    return
  }

  // Generate reset token
  const resetToken = uuidv4()
  const resetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  user.passwordResetToken = resetToken
  user.passwordResetExpires = resetExpires
  await user.save()

  // Send reset email
  await sendPasswordResetEmail(user.email, user.name, resetToken)

  res.json({
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent',
  })
})

// Reset password with token
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body

  if (!token || !password) {
    throw new AppError(400, 'Token and new password are required')
  }

  if (password.length < 8) {
    throw new AppError(400, 'Password must be at least 8 characters')
  }

  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: new Date() },
  })

  if (!user) {
    throw new AppError(400, 'Invalid or expired reset token')
  }

  // Update password (will be hashed by pre-save hook)
  user.password = password
  user.passwordResetToken = undefined
  user.passwordResetExpires = undefined
  await user.save()

  res.json({
    success: true,
    message: 'Password reset successfully',
  })
})