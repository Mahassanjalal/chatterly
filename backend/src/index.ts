import express from 'express'
import http from 'http'
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'
import { appConfig } from './config/env'
import { logger } from './config/logger'
import { connectToMongoDB } from './config/mongodb'
import { connectToRedis } from './config/redis'
import { errorHandler } from './middleware/error'
import { SocketService } from './services/socket.service'

// Import routes
import authRoutes from './routes/auth.routes'
import profileRoutes from './routes/profile.routes'

// Create Express app
const app = express()
const server = http.createServer(app)

// Initialize socket service
new SocketService(server)

// Middleware
app.use(helmet())
app.use(cors({
  origin: appConfig.cors.origin,
  credentials: true,
}))
app.use(compression())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/profile', profileRoutes)

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

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
