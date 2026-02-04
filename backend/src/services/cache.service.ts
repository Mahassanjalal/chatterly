import { redis } from '../config/redis';
import { logger } from '../config/logger';

/**
 * High-Performance Cache Service
 * Optimized for handling millions of concurrent users with Redis
 * 
 * Features:
 * - LRU-style caching with TTL
 * - Distributed caching across multiple nodes
 * - Batch operations for efficiency
 * - Cache-aside pattern implementation
 */

// Cache configuration for different data types
export interface CacheConfig {
  ttl: number; // Time to live in seconds
  prefix: string;
  maxSize?: number; // Optional max size hint
}

// Default cache configurations
export const CACHE_CONFIGS = {
  USER: { ttl: 300, prefix: 'user:' }, // 5 minutes
  USER_SESSION: { ttl: 3600, prefix: 'session:' }, // 1 hour
  USER_ONLINE: { ttl: 60, prefix: 'online:' }, // 1 minute, frequently updated
  MATCH_QUEUE: { ttl: 1800, prefix: 'queue:' }, // 30 minutes
  ACTIVE_MATCHES: { ttl: 7200, prefix: 'match:' }, // 2 hours
  RATE_LIMIT: { ttl: 60, prefix: 'ratelimit:' }, // 1 minute
  BLOCKED_USERS: { ttl: 600, prefix: 'blocked:' }, // 10 minutes
  SUBSCRIPTION: { ttl: 300, prefix: 'subscription:' }, // 5 minutes
} as const;

export class CacheService {
  private defaultTTL: number = 300; // 5 minutes default

  /**
   * Get a cached value
   */
  async get<T>(key: string, config?: CacheConfig): Promise<T | null> {
    try {
      const cacheKey = config ? `${config.prefix}${key}` : key;
      const data = await redis.get(cacheKey);
      
      if (!data) {
        return null;
      }
      
      return JSON.parse(data) as T;
    } catch (error) {
      logger.error('Cache get error:', { key, error });
      return null;
    }
  }

  /**
   * Set a cached value
   */
  async set<T>(key: string, value: T, config?: CacheConfig): Promise<boolean> {
    try {
      const cacheKey = config ? `${config.prefix}${key}` : key;
      const ttl = config?.ttl || this.defaultTTL;
      
      await redis.setEx(cacheKey, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Cache set error:', { key, error });
      return false;
    }
  }

  /**
   * Delete a cached value
   */
  async delete(key: string, config?: CacheConfig): Promise<boolean> {
    try {
      const cacheKey = config ? `${config.prefix}${key}` : key;
      await redis.del(cacheKey);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', { key, error });
      return false;
    }
  }

  /**
   * Get or set pattern - if cache miss, execute callback and cache result
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    config?: CacheConfig
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key, config);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch data
    const data = await fetchFn();
    
    // Cache the result
    await this.set(key, data, config);
    
    return data;
  }

  /**
   * Batch get multiple keys
   */
  async mget<T>(keys: string[], config?: CacheConfig): Promise<Map<string, T | null>> {
    try {
      const cacheKeys = config ? keys.map(k => `${config.prefix}${k}`) : keys;
      const values = await redis.mGet(cacheKeys);
      
      const result = new Map<string, T | null>();
      keys.forEach((key, index) => {
        const value = values[index];
        result.set(key, value ? JSON.parse(value) : null);
      });
      
      return result;
    } catch (error) {
      logger.error('Cache mget error:', { error });
      return new Map();
    }
  }

  /**
   * Batch set multiple keys
   */
  async mset<T>(entries: Map<string, T>, config?: CacheConfig): Promise<boolean> {
    try {
      const pipeline = redis.multi();
      const ttl = config?.ttl || this.defaultTTL;
      
      for (const [key, value] of entries) {
        const cacheKey = config ? `${config.prefix}${key}` : key;
        pipeline.setEx(cacheKey, ttl, JSON.stringify(value));
      }
      
      await pipeline.exec();
      return true;
    } catch (error) {
      logger.error('Cache mset error:', { error });
      return false;
    }
  }

  /**
   * Increment a counter
   */
  async incr(key: string, config?: CacheConfig): Promise<number> {
    try {
      const cacheKey = config ? `${config.prefix}${key}` : key;
      const value = await redis.incr(cacheKey);
      
      // Set TTL on first increment
      if (value === 1 && config?.ttl) {
        await redis.expire(cacheKey, config.ttl);
      }
      
      return value;
    } catch (error) {
      logger.error('Cache incr error:', { key, error });
      return 0;
    }
  }

  /**
   * Add to a set (for unique collections like online users)
   */
  async sadd(key: string, member: string, config?: CacheConfig): Promise<boolean> {
    try {
      const cacheKey = config ? `${config.prefix}${key}` : key;
      await redis.sAdd(cacheKey, member);
      
      if (config?.ttl) {
        await redis.expire(cacheKey, config.ttl);
      }
      
      return true;
    } catch (error) {
      logger.error('Cache sadd error:', { key, error });
      return false;
    }
  }

  /**
   * Remove from a set
   */
  async srem(key: string, member: string, config?: CacheConfig): Promise<boolean> {
    try {
      const cacheKey = config ? `${config.prefix}${key}` : key;
      await redis.sRem(cacheKey, member);
      return true;
    } catch (error) {
      logger.error('Cache srem error:', { key, error });
      return false;
    }
  }

  /**
   * Get all members of a set
   */
  async smembers(key: string, config?: CacheConfig): Promise<string[]> {
    try {
      const cacheKey = config ? `${config.prefix}${key}` : key;
      return await redis.sMembers(cacheKey);
    } catch (error) {
      logger.error('Cache smembers error:', { key, error });
      return [];
    }
  }

  /**
   * Check if member exists in set
   */
  async sismember(key: string, member: string, config?: CacheConfig): Promise<boolean> {
    try {
      const cacheKey = config ? `${config.prefix}${key}` : key;
      return await redis.sIsMember(cacheKey, member);
    } catch (error) {
      logger.error('Cache sismember error:', { key, error });
      return false;
    }
  }

  /**
   * Get set cardinality (count)
   */
  async scard(key: string, config?: CacheConfig): Promise<number> {
    try {
      const cacheKey = config ? `${config.prefix}${key}` : key;
      return await redis.sCard(cacheKey);
    } catch (error) {
      logger.error('Cache scard error:', { key, error });
      return 0;
    }
  }

  /**
   * Publish a message to a channel (for real-time notifications)
   */
  async publish(channel: string, message: string): Promise<number> {
    try {
      return await redis.publish(channel, message);
    } catch (error) {
      logger.error('Cache publish error:', { channel, error });
      return 0;
    }
  }

  /**
   * Clear cache by pattern using SCAN (non-blocking)
   * Uses SCAN instead of KEYS to avoid blocking Redis in production
   */
  async clearByPattern(pattern: string): Promise<number> {
    try {
      let cursor = 0;
      let deletedCount = 0;
      
      // Use SCAN to iterate through keys without blocking
      do {
        const result = await redis.scan(cursor, {
          MATCH: pattern,
          COUNT: 100 // Process 100 keys at a time
        });
        
        cursor = result.cursor;
        const keys = result.keys;
        
        if (keys.length > 0) {
          await redis.del(keys);
          deletedCount += keys.length;
        }
      } while (cursor !== 0);
      
      return deletedCount;
    } catch (error) {
      logger.error('Cache clearByPattern error:', { pattern, error });
      return 0;
    }
  }

  /**
   * Check if cache is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await redis.ping();
      return true;
    } catch (error) {
      logger.error('Cache health check failed:', error);
      return false;
    }
  }

  /**
   * Get cache stats
   */
  async getStats(): Promise<{
    connected: boolean;
    memoryUsed: string;
    connectedClients: number;
  }> {
    try {
      const info = await redis.info('memory');
      const clientInfo = await redis.info('clients');
      
      const memoryMatch = info.match(/used_memory_human:(\S+)/);
      const clientMatch = clientInfo.match(/connected_clients:(\d+)/);
      
      return {
        connected: true,
        memoryUsed: memoryMatch ? memoryMatch[1] : 'unknown',
        connectedClients: clientMatch ? parseInt(clientMatch[1]) : 0,
      };
    } catch (error) {
      return {
        connected: false,
        memoryUsed: 'unknown',
        connectedClients: 0,
      };
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();
