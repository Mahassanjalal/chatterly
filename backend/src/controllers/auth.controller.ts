import { Request, Response } from 'express'
import jwt, { SignOptions } from 'jsonwebtoken'
import { User, userSchema } from '../models/user.model'
import { appConfig } from '../config/env'
import { AppError } from '../middleware/error'

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

export const signup = async (req: Request, res: Response) => {
  const { name, email, password, gender, preferredGender } = await userSchema.parseAsync(req.body)

  const existingUser = await User.findOne({ email })
  if (existingUser) {
    throw new AppError(409, 'Email already registered')
  }

  const user = new User({ 
    name, 
    email, 
    password,
    gender,
    preferredGender: preferredGender || 'both'
  })
  await user.save()

  const token = generateToken(user._id)

  res.status(201).json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      gender: user.gender,
      preferredGender: user.preferredGender,
    },
  })
}

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body

  const user = await User.findOne({ email })
  if (!user) {
    throw new AppError(401, 'Invalid credentials')
  }

  const isPasswordValid = await user.comparePassword(password)
  if (!isPasswordValid) {
    throw new AppError(401, 'Invalid credentials')
  }

  const token = generateToken(user._id)

  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      gender: user.gender,
      preferredGender: user.preferredGender,
    },
  })
}

export const me = async (req: Request, res: Response) => {
  const user = await User.findById(req.user?._id).select('-password')
  if (!user) {
    throw new AppError(404, 'User not found')
  }

  res.json(user)
}
