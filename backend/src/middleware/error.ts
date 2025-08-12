import { Request, Response, NextFunction } from 'express'
import { logger } from '../config/logger'
import { appConfig } from '../config/env'
import { ZodError } from 'zod'
import mongoose from 'mongoose'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message)
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  logger.error('Error:', {
    message: err.message,
    stack: appConfig.isDevelopment ? err.stack : undefined,
  })

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
    })
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors,
    })
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      error: 'Validation error',
      details: Object.values(err.errors).map((e) => e.message),
    })
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({
      error: 'Invalid ID format',
    })
  }

  // MongoDB duplicate key error
  if ((err as any).code === 11000) {
    return res.status(409).json({
      error: 'Duplicate value error',
    })
  }

  // Default error
  return res.status(500).json({
    error: appConfig.isDevelopment ? err.message : 'Internal server error',
  })
}
