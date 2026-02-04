import { Request, Response } from 'express'
import jwt, { SignOptions } from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { User, userSchema } from '../models/user.model'
import { appConfig } from '../config/env'
import { AppError } from '../middleware/error'
import { asyncHandler } from '../utils/asyncHandler'
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.service'
import bcrypt from 'bcryptjs'

// Extend Request type to include user
declare module 'express' {
  interface Request {
    user?: {
      _id: string;
      [key: string]: any;
    };
  }
}

const generateToken = (userId: string): string => {
  const signOptions: any = {
    expiresIn:  appConfig.jwt.expiresIn
  }
  return jwt.sign({ id: userId }, appConfig.jwt.secret, signOptions)
}

const sendTokenResponse = (user: any, statusCode: number, res: Response) => {
  const token = generateToken(user._id)

  const cookieOptions = {
    expires: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days matching JWT_EXPIRES_IN
    ),
    httpOnly: true,
    secure: appConfig.isProduction,
    sameSite: 'lax' as const,
  }

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        gender: user.gender,
        type: user.type,
      },
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
  })
  await user.save()

  // Send verification email (don't block response)
  sendVerificationEmail(email, name, verificationToken).catch(err => {
    console.error('Failed to send verification email:', err)
  })

  sendTokenResponse(user, 201, res)
})

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body

  const user = await User.findOne({ email })
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError(401, 'Invalid credentials')
  }

  sendTokenResponse(user, 200, res)
})

export const logout = asyncHandler(async (req: Request, res: Response) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  })

  res.status(200).json({
    success: true,
    message: 'User logged out',
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