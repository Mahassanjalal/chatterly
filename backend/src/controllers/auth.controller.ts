import { Request, Response } from 'express'
import jwt, { SignOptions } from 'jsonwebtoken'
import { User, userSchema } from '../models/user.model'
import { appConfig } from '../config/env'
import { AppError } from '../middleware/error'
import { asyncHandler } from '../utils/asyncHandler'

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

  const user = new User({ 
    name, 
    email, 
    password,
    gender,
    dateOfBirth,
    type: type || 'free'
  })
  await user.save()

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
    }
  })
})