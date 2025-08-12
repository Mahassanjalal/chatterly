import mongoose from 'mongoose'
import { appConfig } from './env'
import { logger } from './logger'

export async function connectToMongoDB(): Promise<void> {
  try {
    await mongoose.connect(appConfig.mongodb.uri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    })
    
    logger.info('Successfully connected to MongoDB')
    
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error)
    })

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected')
    })

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
