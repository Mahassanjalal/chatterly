import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { appConfig } from '../config/env'
import { User } from '../models/user.model'
import { logger } from '../config/logger'

export interface AuthRequest extends Request {
  user?: any
}

export const auth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')

    if (!token) {
      throw new Error()
    }

    const decoded = jwt.verify(token, appConfig.jwt.secret) as { id: string }
    const user = await User.findById(decoded.id)

    if (!user) {
      throw new Error()
    }

    req.user = user
    next()
  } catch (error) {
    logger.error('Authentication error:', error)
    res.status(401).json({ error: 'Please authenticate' })
  }
}
