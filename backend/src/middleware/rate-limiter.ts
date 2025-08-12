import rateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import { redis } from '../config/redis'
import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth'
import { User } from '../models/user.model'

// Generic API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.sendCommand(args)
  }),
  message: 'Too many requests from this IP, please try again after 15 minutes'
})

// More strict limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 requests per window
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.sendCommand(args)
  }),
  message: 'Too many login attempts from this IP, please try again after an hour'
})

// Dynamic rate limiter based on user status
export const dynamicLimiter = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next()
  }

  const user = await User.findById(req.user._id)
  if (!user) {
    return next()
  }

  // Apply stricter rate limits for users with flags
  if (user.flags.requiresCaptcha || user.flags.isUnderReview) {
    const strictLimiter = rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 30, // Very limited requests
      store: new RedisStore({
        sendCommand: (...args: string[]) => redis.sendCommand(args)
      }),
      message: 'Request limit exceeded. Please try again later.'
    })
    return strictLimiter(req, res, next)
  }

  // Normal users proceed
  next()
}
