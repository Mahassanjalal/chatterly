import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth'
import { AppError } from './error'

/**
 * Middleware to check if user has admin role
 */
export const adminOnly = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required')
    }

    if (req.user.role !== 'admin') {
      throw new AppError(403, 'Admin access required')
    }

    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Middleware to check if user has moderator or admin role
 */
export const moderatorOrAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required')
    }

    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      throw new AppError(403, 'Moderator or admin access required')
    }

    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Middleware to check if user's email is verified
 */
export const emailVerifiedOnly = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required')
    }

    if (!req.user.flags?.isEmailVerified) {
      throw new AppError(403, 'Email verification required')
    }

    next()
  } catch (error) {
    next(error)
  }
}
