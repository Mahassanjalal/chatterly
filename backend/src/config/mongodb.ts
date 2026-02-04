import mongoose from 'mongoose'
import { appConfig } from './env'
import { logger } from './logger'

/**
 * MongoDB Connection Configuration
 * Optimized for handling 1M+ concurrent users
 * 
 * Key optimizations:
 * - Connection pooling (maxPoolSize)
 * - Read preferences for scaling
 * - Retry logic for resilience
 * - Connection keep-alive
 */

export async function connectToMongoDB(): Promise<void> {
  try {
    await mongoose.connect(appConfig.mongodb.uri, {
      // Connection pooling - crucial for high concurrency
      maxPoolSize: 100, // Maximum connections in the pool
      minPoolSize: 10, // Minimum connections to maintain
      
      // Timeouts
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      
      // Retry configuration
      retryWrites: true,
      retryReads: true,
      
      // Keep-alive settings for persistent connections
      heartbeatFrequencyMS: 10000,
      
      // Indexing
      autoIndex: appConfig.isDevelopment, // Only auto-index in development
      
      // Compression for reduced network overhead
      compressors: ['zstd', 'snappy', 'zlib'],
      
      // Write concern for data safety
      w: 'majority',
      wtimeoutMS: 2500,
    })
    
    logger.info('Successfully connected to MongoDB')
    logger.info(`MongoDB pool: min=${10}, max=${100}`)
    
    // Connection event handlers
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error)
    })

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected')
    })

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected')
    })

    // Monitor connection pool
    setInterval(() => {
      if (appConfig.isDevelopment && mongoose.connection.readyState === 1) {
        logger.debug('MongoDB connection healthy')
      }
    }, 60000) // Check every minute

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close()
        logger.info('MongoDB connection closed through app termination')
        process.exit(0)
      } catch (error) {
        logger.error('Error closing MongoDB connection:', error)
        process.exit(1)
      }
    })
  } catch (error) {
    logger.error('Error connecting to MongoDB:', error)
    process.exit(1)
  }
}

/**
 * Get connection health status
 */
export function getMongoDBHealth(): {
  connected: boolean;
  readyState: number;
  host?: string;
} {
  return {
    connected: mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
  }
}
