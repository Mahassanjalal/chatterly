import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { appConfig } from '../config/env'
import { User, IUser } from '../models/user.model'
import { AppError } from './error'

export interface AuthRequest extends Request {
  user?: IUser
  userId?: string
}

export const auth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = req.header('Authorization')?.replace('Bearer ', '')

    if (!token && req.cookies) {
      // Try access token first, then fall back to legacy token
      token = req.cookies.accessToken || req.cookies.token
    }

    if (!token) {
      throw new AppError(401, 'Access token required')
    }

    const decoded = jwt.verify(token, appConfig.jwt.secret) as { id: string }
    const user = await User.findById(decoded.id)

    if (!user) {
      throw new AppError(401, 'User not found')
    }

    // Check if account is locked
    if (user.security?.lockoutUntil && new Date(user.security.lockoutUntil) > new Date()) {
      throw new AppError(423, 'Account is locked')
    }

    req.user = user
    req.userId = user.id
    next()
  } catch (error) {
    if (error instanceof AppError) {
      return next(error)
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError(401, 'Invalid token'))
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      // Token expired - client should use refresh token
      return next(new AppError(401, 'Token expired. Please refresh your session.'))
    }
    
    next(new AppError(401, 'Authentication failed'))
  }
}

// Alias for backward compatibility
export const authMiddleware = auth
