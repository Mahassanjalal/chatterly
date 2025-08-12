import { createClient } from 'redis'
import { appConfig } from './env'
import { logger } from './logger'

export const redis = createClient({
  url: appConfig.redis.url,
})

redis.on('error', (error) => {
  logger.error('Redis client error:', error)
})

redis.on('connect', () => {
  logger.info('Successfully connected to Redis')
})

redis.on('reconnecting', () => {
  logger.warn('Redis client reconnecting')
})

export async function connectToRedis(): Promise<void> {
  try {
    await redis.connect()
  } catch (error) {
    logger.error('Error connecting to Redis:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await redis.quit()
    logger.info('Redis connection closed through app termination')
    process.exit(0)
  } catch (error) {
    logger.error('Error closing Redis connection:', error)
    process.exit(1)
  }
})
