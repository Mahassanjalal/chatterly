import express from 'express'
import http from 'http'
import mongoose from 'mongoose'
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import { appConfig } from './config/env'
import { logger } from './config/logger'
import { connectToMongoDB } from './config/mongodb'
import { connectToRedis } from './config/redis'
import { errorHandler } from './middleware/error'
import { SocketService } from './services/socket.service'
import { initSentry, sentryRequestHandler, sentryTracingHandler, sentryErrorHandler } from './services/sentry.service'

// Import routes
import authRoutes from './routes/auth.routes'
import profileRoutes from './routes/profile.routes'
import analyticsRoutes from './routes/analytics.routes'
import subscriptionRoutes from './routes/subscription.routes'
import webrtcRoutes from './routes/webrtc.routes'
import adminRoutes from './routes/admin.routes'
import gdprRoutes from './routes/gdpr.routes'
import blockingRoutes from './routes/blocking.routes'
import notificationRoutes from './routes/notification.routes'

// Create Express app
const app = express()
const server = http.createServer(app)

// Initialize Sentry (before other middleware)
initSentry(app)

// Sentry request handler (must be first)
if (process.env.SENTRY_DSN) {
  app.use(sentryRequestHandler)
  app.use(sentryTracingHandler)
}

// Initialize socket service
new SocketService(server)

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", appConfig.cors.origin, "wss:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}))
app.use(cors({
  origin: appConfig.cors.origin,
  credentials: true,
}))
app.use(compression())
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/subscription', subscriptionRoutes)
app.use('/api/webrtc', webrtcRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/gdpr', gdprRoutes)
app.use('/api/blocking', blockingRoutes)
app.use('/api/notifications', notificationRoutes)

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: appConfig.env
  })
})

app.get('/health/ready', async (req, res) => {
  // Check DB connection
  const isDbConnected = mongoose.connection.readyState === 1
  
  if (isDbConnected) {
    res.json({ status: 'ready' })
  } else {
    res.status(503).json({ status: 'not ready', database: isDbConnected ? 'up' : 'down' })
  }
})

// Sentry error handler (before other error handlers)
if (process.env.SENTRY_DSN) {
  app.use(sentryErrorHandler)
}

// Error handling
app.use(errorHandler)

// Start server
const start = async () => {
  try {
    // Connect to MongoDB
    await connectToMongoDB()
    
    // Connect to Redis
    await connectToRedis()
    
    // Start server
    server.listen(appConfig.port, () => {
      logger.info(`Server is running on port ${appConfig.port}`)
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

start()

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
  // Application specific logging, throwing an error, or other logic here
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
  // Graceful shutdown
  process.exit(1)
})
