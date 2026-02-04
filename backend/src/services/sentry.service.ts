import * as Sentry from '@sentry/node'
import { Express, Request, Response, NextFunction } from 'express'
import { logger } from '../config/logger'

/**
 * Initialize Sentry for error tracking and APM
 */
export const initSentry = (app: Express): void => {
  const dsn = process.env.SENTRY_DSN

  if (!dsn) {
    logger.warn('Sentry DSN not configured. Error tracking is disabled.')
    return
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.APP_VERSION || '1.0.0',
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Don't send errors in test environment
    enabled: process.env.NODE_ENV !== 'test',

    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization']
        delete event.request.headers['cookie']
      }
      
      // Remove sensitive data from request body
      if (event.request?.data) {
        try {
          const data = typeof event.request.data === 'string' 
            ? JSON.parse(event.request.data) 
            : event.request.data
          
          if (data.password) data.password = '[REDACTED]'
          if (data.token) data.token = '[REDACTED]'
          if (data.email) data.email = '[REDACTED]'
          
          event.request.data = JSON.stringify(data)
        } catch (e) {
          // Not JSON, leave as is
        }
      }
      
      return event
    },
  })

  logger.info('Sentry initialized successfully')
}

/**
 * Capture exception with additional context
 */
export const captureException = (
  error: Error,
  context?: Record<string, any>
): void => {
  if (process.env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (context) {
        scope.setExtras(context)
      }
      Sentry.captureException(error)
    })
  }
  
  // Always log locally
  logger.error('Error captured:', error, context)
}

/**
 * Capture message with severity
 */
export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
): void => {
  if (process.env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (context) {
        scope.setExtras(context)
      }
      Sentry.captureMessage(message, level)
    })
  }
}

/**
 * Set user context for Sentry
 */
export const setUser = (user: { id: string; email?: string; name?: string }): void => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  })
}

/**
 * Clear user context
 */
export const clearUser = (): void => {
  Sentry.setUser(null)
}

/**
 * Add breadcrumb for debugging
 */
export const addBreadcrumb = (
  message: string,
  category: string,
  data?: Record<string, any>
): void => {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  })
}

/**
 * Sentry request handler middleware
 */
export const sentryRequestHandler = (req: Request, res: Response, next: NextFunction) => {
  Sentry.setContext('request', {
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
  })
  next()
}

/**
 * Sentry tracing handler middleware
 */
export const sentryTracingHandler = (req: Request, res: Response, next: NextFunction) => {
  // Basic tracing setup - start a transaction
  next()
}

/**
 * Sentry error handler middleware (must be after all controllers)
 */
export const sentryErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const status = (err as any).status || (err as any).statusCode || 500
  if (status >= 400) {
    Sentry.captureException(err, {
      extra: {
        method: req.method,
        url: req.url,
        body: req.body,
      },
    })
  }
  next(err)
}

export const sentryService = {
  init: initSentry,
  captureException,
  captureMessage,
  setUser,
  clearUser,
  addBreadcrumb,
  requestHandler: sentryRequestHandler,
  tracingHandler: sentryTracingHandler,
  errorHandler: sentryErrorHandler,
}
