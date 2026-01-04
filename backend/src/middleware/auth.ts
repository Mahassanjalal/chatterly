import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { appConfig } from '../config/env'
import { User } from '../models/user.model'
import { AppError } from './error'

export interface AuthRequest extends Request {
  user?: any
}

export const auth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = req.header('Authorization')?.replace('Bearer ', '')

    if (!token && req.cookies) {
      token = req.cookies.token
    }

    if (!token) {
      throw new AppError(401, 'Access token required')
    }

    const decoded = jwt.verify(token, appConfig.jwt.secret) as { id: string }
    const user = await User.findById(decoded.id)

    if (!user) {
      throw new AppError(401, 'User not found')
    }

    req.user = user
    next()
  } catch (error) {
    if (error instanceof AppError) {
      return next(error)
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError(401, 'Invalid token'))
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError(401, 'Token expired'))
    }
    
    next(new AppError(401, 'Authentication failed'))
  }
}
