import { v4 as uuidv4 } from 'uuid';
import { redis } from '../config/redis';
import { User, IUser } from '../models/user.model';
import { logger } from '../config/logger';
import { cacheService, CACHE_CONFIGS } from './cache.service';

/**
 * Distributed Matching Queue Service
 * Designed for handling 1M+ concurrent users with Redis-based sharding
 * 
 * Key features:
 * - Sharded queues for horizontal scaling
 * - Priority-based matching with premium users
 * - Region-based matching for lower latency
 * - Lock-free matching algorithm using Redis transactions
 */

// Matching user data stored in Redis
export interface QueuedUser {
  userId: string;
  socketId: string;
  gender?: 'male' | 'female' | 'other';
  preferredGender: 'male' | 'female' | 'both';
  userType: 'free' | 'pro';
  region?: string;
  interests?: string[];
  priority: number;
  joinedAt: number; // Unix timestamp for sorting
  blockedUsers: string[];
}

// Match result
export interface DistributedMatchResult {
  matchId: string;
  user1: QueuedUser;
  user2: QueuedUser;
  matchScore: number;
  matchedAt: number;
}

// Queue configuration
const QUEUE_CONFIG = {
  SHARDS: 16, // Number of queue shards for distribution
  MATCH_BATCH_SIZE: 100, // Users to check per matching cycle
  MATCH_TIMEOUT_MS: 30000, // 30 seconds match timeout
  CLEANUP_INTERVAL_MS: 60000, // 1 minute cleanup interval
  MAX_WAIT_TIME_MS: 1800000, // 30 minutes max wait
};

// Redis key patterns
const KEYS = {
  QUEUE_SHARD: (shard: number) => `match_queue:shard:${shard}`,
  QUEUE_USER: (userId: string) => `match_queue:user:${userId}`,
  ACTIVE_MATCH: (matchId: string) => `active_match:${matchId}`,
  USER_MATCH: (userId: string) => `user_match:${userId}`,
  ONLINE_USERS: 'online_users',
  QUEUE_STATS: 'match_queue:stats',
};

export class DistributedMatchingService {
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTask();
  }

  /**
   * Calculate shard for a user (consistent hashing)
   */
  private getUserShard(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % QUEUE_CONFIG.SHARDS;
  }

  /**
   * Add user to the distributed matching queue
   */
  async addToQueue(
    userId: string,
    socketId: string,
    preferences: {
      preferredGender?: 'male' | 'female' | 'both';
      region?: string;
      interests?: string[];
    }
  ): Promise<DistributedMatchResult | null> {
    try {
      // Get user data from cache or database
      const user = await this.getUserData(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user is already in a match
      const existingMatch = await this.getUserCurrentMatch(userId);
      if (existingMatch) {
        // Remove from existing match first
        await this.removeFromMatch(userId);
      }

      // Determine final preferences based on user type
      // Business rule: Free users cannot filter to opposite gender only (premium feature)
      // - Free users can choose 'both' (any gender) or 'same' gender as themselves
      // - Attempting to filter to opposite gender defaults to 'both'
      let finalPreference: 'male' | 'female' | 'both' = preferences.preferredGender || 'both';
      if (user.type === 'free' && finalPreference !== 'both' && finalPreference !== user.gender) {
        // Opposite-gender-only filtering is a premium feature
        finalPreference = 'both';
      }

      // Calculate priority
      const priority = this.calculatePriority(user);

      // Create queued user object
      const queuedUser: QueuedUser = {
        userId,
        socketId,
        gender: user.gender,
        preferredGender: finalPreference,
        userType: user.type,
        region: preferences.region,
        interests: preferences.interests || [],
        priority,
        joinedAt: Date.now(),
        blockedUsers: user.blockedUsers || [],
      };

      // Try to find a match immediately
      const match = await this.findMatch(queuedUser);
      if (match) {
        return match;
      }

      // No match found, add to queue
      await this.addUserToQueueShard(queuedUser);
      
      logger.info(`User ${userId} added to distributed queue (shard ${this.getUserShard(userId)}, priority ${priority})`);
      return null;
    } catch (error) {
      logger.error('Error adding user to distributed queue:', error);
      throw error;
    }
  }

  /**
   * Find a match for a user
   */
  private async findMatch(newUser: QueuedUser): Promise<DistributedMatchResult | null> {
    const candidates: Array<{ user: QueuedUser; score: number }> = [];

    // Search across all shards for potential matches
    for (let shard = 0; shard < QUEUE_CONFIG.SHARDS; shard++) {
      const shardCandidates = await this.findCandidatesInShard(shard, newUser);
      candidates.push(...shardCandidates);
    }

    if (candidates.length === 0) {
      return null;
    }

    // Sort by score (descending) and priority
    candidates.sort((a, b) => {
      const scoreA = a.score + (a.user.priority / 1000);
      const scoreB = b.score + (b.user.priority / 1000);
      return scoreB - scoreA;
    });

    // Try to match with top candidates using atomic operations
    for (const candidate of candidates.slice(0, 5)) {
      const match = await this.tryCreateMatch(newUser, candidate.user, candidate.score);
      if (match) {
        return match;
      }
    }

    return null;
  }

  /**
   * Find candidates in a specific shard
   */
  private async findCandidatesInShard(
    shard: number,
    newUser: QueuedUser
  ): Promise<Array<{ user: QueuedUser; score: number }>> {
    const candidates: Array<{ user: QueuedUser; score: number }> = [];
    
    try {
      const queueKey = KEYS.QUEUE_SHARD(shard);
      
      // Get users from shard sorted set (by priority + wait time)
      const userIds = await redis.zRange(queueKey, 0, QUEUE_CONFIG.MATCH_BATCH_SIZE - 1, { REV: true });
      
      if (userIds.length === 0) return [];

      // Batch fetch user data
      const userKeys = userIds.map(id => KEYS.QUEUE_USER(id));
      const userData = await redis.mGet(userKeys);

      for (let i = 0; i < userIds.length; i++) {
        if (!userData[i]) continue;
        
        const waitingUser: QueuedUser = JSON.parse(userData[i]);
        
        // Skip self
        if (waitingUser.userId === newUser.userId) continue;
        
        // Check compatibility
        if (!this.areUsersCompatible(newUser, waitingUser)) continue;
        
        // Calculate match score
        const score = this.calculateMatchScore(newUser, waitingUser);
        candidates.push({ user: waitingUser, score });
      }
    } catch (error) {
      logger.error(`Error finding candidates in shard ${shard}:`, error);
    }

    return candidates;
  }

  /**
   * Try to create a match atomically
   */
  private async tryCreateMatch(
    user1: QueuedUser,
    user2: QueuedUser,
    score: number
  ): Promise<DistributedMatchResult | null> {
    // Use UUID for collision-resistant match ID generation
    const matchId = `match_${Date.now()}_${uuidv4().slice(0, 8)}`;
    
    try {
      // Use Redis transaction to atomically create match and remove users from queue
      const shard1 = this.getUserShard(user1.userId);
      const shard2 = this.getUserShard(user2.userId);

      // Watch the user keys to detect conflicts
      await redis.watch([
        KEYS.QUEUE_USER(user1.userId),
        KEYS.QUEUE_USER(user2.userId),
      ]);

      // Check if both users are still available
      const [user1Data, user2Data] = await redis.mGet([
        KEYS.QUEUE_USER(user1.userId),
        KEYS.QUEUE_USER(user2.userId),
      ]);

      // Only user2 needs to be in queue, user1 is the new user
      if (!user2Data) {
        await redis.unwatch();
        return null; // user2 was matched by someone else
      }

      // Execute transaction
      const pipeline = redis.multi();
      
      // Remove both users from their queue shards
      pipeline.zRem(KEYS.QUEUE_SHARD(shard2), user2.userId);
      if (user1Data) {
        pipeline.zRem(KEYS.QUEUE_SHARD(shard1), user1.userId);
      }
      
      // Remove user data from queue
      pipeline.del(KEYS.QUEUE_USER(user1.userId));
      pipeline.del(KEYS.QUEUE_USER(user2.userId));

      const matchResult: DistributedMatchResult = {
        matchId,
        user1,
        user2,
        matchScore: score,
        matchedAt: Date.now(),
      };

      // Store active match
      pipeline.setEx(
        KEYS.ACTIVE_MATCH(matchId),
        7200, // 2 hour TTL
        JSON.stringify(matchResult)
      );

      // Store user-to-match mapping for quick lookup
      pipeline.setEx(KEYS.USER_MATCH(user1.userId), 7200, matchId);
      pipeline.setEx(KEYS.USER_MATCH(user2.userId), 7200, matchId);

      // Update stats
      pipeline.hIncrBy(KEYS.QUEUE_STATS, 'total_matches', 1);

      const results = await pipeline.exec();
      
      if (!results) {
        // Transaction failed (conflict)
        return null;
      }

      logger.info(`Match created: ${matchId} (${user1.userId} <-> ${user2.userId}, score: ${score.toFixed(2)})`);
      return matchResult;
    } catch (error) {
      logger.error('Error creating match:', error);
      try {
        await redis.unwatch();
      } catch {
        // Ignore unwatch errors
      }
      return null;
    }
  }

  /**
   * Add user to their queue shard
   */
  private async addUserToQueueShard(user: QueuedUser): Promise<void> {
    const shard = this.getUserShard(user.userId);
    const queueKey = KEYS.QUEUE_SHARD(shard);
    
    // Calculate score for sorted set (priority + inverse wait time)
    const score = user.priority * 1000000 + (Date.now() - user.joinedAt);
    
    const pipeline = redis.multi();
    
    // Add to sorted set
    pipeline.zAdd(queueKey, { score, value: user.userId });
    
    // Store user data
    pipeline.setEx(
      KEYS.QUEUE_USER(user.userId),
      QUEUE_CONFIG.MAX_WAIT_TIME_MS / 1000,
      JSON.stringify(user)
    );
    
    // Update stats
    pipeline.hIncrBy(KEYS.QUEUE_STATS, 'queue_joins', 1);
    
    await pipeline.exec();
  }

  /**
   * Remove user from queue
   */
  async removeFromQueue(userId: string): Promise<void> {
    try {
      const shard = this.getUserShard(userId);
      
      const pipeline = redis.multi();
      pipeline.zRem(KEYS.QUEUE_SHARD(shard), userId);
      pipeline.del(KEYS.QUEUE_USER(userId));
      await pipeline.exec();
      
      logger.debug(`User ${userId} removed from queue`);
    } catch (error) {
      logger.error('Error removing user from queue:', error);
    }
  }

  /**
   * Remove user from active match
   */
  async removeFromMatch(userId: string): Promise<string | null> {
    try {
      const matchId = await redis.get(KEYS.USER_MATCH(userId));
      if (!matchId) return null;

      const matchData = await redis.get(KEYS.ACTIVE_MATCH(matchId));
      if (!matchData) {
        await redis.del(KEYS.USER_MATCH(userId));
        return null;
      }

      const match: DistributedMatchResult = JSON.parse(matchData);
      const otherUserId = match.user1.userId === userId ? match.user2.userId : match.user1.userId;

      // Clean up match data
      const pipeline = redis.multi();
      pipeline.del(KEYS.ACTIVE_MATCH(matchId));
      pipeline.del(KEYS.USER_MATCH(userId));
      pipeline.del(KEYS.USER_MATCH(otherUserId));
      pipeline.hIncrBy(KEYS.QUEUE_STATS, 'matches_ended', 1);
      await pipeline.exec();

      logger.info(`Match ${matchId} ended, user ${userId} disconnected`);
      return otherUserId;
    } catch (error) {
      logger.error('Error removing user from match:', error);
      return null;
    }
  }

  /**
   * Get user's current match
   */
  async getUserCurrentMatch(userId: string): Promise<DistributedMatchResult | null> {
    try {
      const matchId = await redis.get(KEYS.USER_MATCH(userId));
      if (!matchId) return null;

      const matchData = await redis.get(KEYS.ACTIVE_MATCH(matchId));
      if (!matchData) return null;

      return JSON.parse(matchData);
    } catch (error) {
      logger.error('Error getting user match:', error);
      return null;
    }
  }

  /**
   * Get match by ID
   */
  async getMatch(matchId: string): Promise<DistributedMatchResult | null> {
    try {
      const matchData = await redis.get(KEYS.ACTIVE_MATCH(matchId));
      if (!matchData) return null;
      return JSON.parse(matchData);
    } catch (error) {
      logger.error('Error getting match:', error);
      return null;
    }
  }

  /**
   * Check if two users are compatible
   */
  private areUsersCompatible(user1: QueuedUser, user2: QueuedUser): boolean {
    // Check blocked users
    if (user1.blockedUsers.includes(user2.userId) || user2.blockedUsers.includes(user1.userId)) {
      return false;
    }

    // Check gender preferences
    const pref1Match = user1.preferredGender === 'both' || user1.preferredGender === user2.gender;
    const pref2Match = user2.preferredGender === 'both' || user2.preferredGender === user1.gender;

    return pref1Match && pref2Match;
  }

  /**
   * Calculate match score between two users
   */
  private calculateMatchScore(user1: QueuedUser, user2: QueuedUser): number {
    let score = 0;

    // Gender preference match (30%)
    const genderScore = this.calculateGenderScore(user1, user2);
    score += genderScore * 0.30;

    // Interest similarity (25%)
    const interestScore = this.calculateInterestScore(user1.interests, user2.interests);
    score += interestScore * 0.25;

    // Region match (15%)
    const regionScore = user1.region && user2.region && user1.region === user2.region ? 1 : 0.5;
    score += regionScore * 0.15;

    // Wait time fairness (20%)
    const waitScore = this.calculateWaitTimeScore(user1, user2);
    score += waitScore * 0.20;

    // User type compatibility (10%)
    const typeScore = user1.userType === user2.userType ? 1 : 0.7;
    score += typeScore * 0.10;

    return Math.min(score, 1);
  }

  private calculateGenderScore(user1: QueuedUser, user2: QueuedUser): number {
    const pref1Match = user1.preferredGender === 'both' || user1.preferredGender === user2.gender;
    const pref2Match = user2.preferredGender === 'both' || user2.preferredGender === user1.gender;
    
    if (pref1Match && pref2Match) return 1;
    if (pref1Match || pref2Match) return 0.5;
    return 0;
  }

  private calculateInterestScore(interests1?: string[], interests2?: string[]): number {
    if (!interests1?.length || !interests2?.length) return 0.5;
    
    const set1 = new Set(interests1.map(i => i.toLowerCase()));
    const set2 = new Set(interests2.map(i => i.toLowerCase()));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    if (union.size === 0) return 0.5;
    return intersection.size / union.size;
  }

  private calculateWaitTimeScore(user1: QueuedUser, user2: QueuedUser): number {
    const maxWaitTime = 120000; // 2 minutes
    const waitTime = Date.now() - user2.joinedAt;
    return Math.min(waitTime / maxWaitTime, 1);
  }

  private calculatePriority(user: IUser): number {
    let priority = 0;
    
    // Premium users get priority
    if (user.type === 'pro') {
      priority += 100;
    }

    // Verified email bonus
    if (user.flags?.isEmailVerified) {
      priority += 10;
    }

    // Good behavior bonus
    if (user.stats?.warningCount === 0 && (user.stats?.connectionCount || 0) > 10) {
      priority += 20;
    }

    // Report penalty
    if (user.stats?.reportCount) {
      priority -= user.stats.reportCount * 5;
    }

    return Math.max(priority, 0);
  }

  /**
   * Get user data from cache or database
   */
  private async getUserData(userId: string): Promise<IUser | null> {
    return cacheService.getOrSet(
      userId,
      async () => {
        const user = await User.findById(userId);
        return user;
      },
      CACHE_CONFIGS.USER
    );
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    totalInQueue: number;
    activeMatches: number;
    shardCounts: number[];
    stats: Record<string, number>;
  }> {
    try {
      let totalInQueue = 0;
      const shardCounts: number[] = [];

      for (let shard = 0; shard < QUEUE_CONFIG.SHARDS; shard++) {
        const count = await redis.zCard(KEYS.QUEUE_SHARD(shard));
        shardCounts.push(count);
        totalInQueue += count;
      }

      const statsData = await redis.hGetAll(KEYS.QUEUE_STATS);
      const stats: Record<string, number> = {};
      for (const [key, value] of Object.entries(statsData)) {
        stats[key] = parseInt(value) || 0;
      }

      // Count active matches by scanning user_match keys (sample-based for performance)
      const activeMatches = stats.total_matches - (stats.matches_ended || 0);

      return {
        totalInQueue,
        activeMatches: Math.max(0, activeMatches),
        shardCounts,
        stats,
      };
    } catch (error) {
      logger.error('Error getting queue stats:', error);
      return {
        totalInQueue: 0,
        activeMatches: 0,
        shardCounts: [],
        stats: {},
      };
    }
  }

  /**
   * Cleanup stale entries
   */
  private async cleanup(): Promise<void> {
    try {
      const cutoffTime = Date.now() - QUEUE_CONFIG.MAX_WAIT_TIME_MS;
      let removed = 0;

      for (let shard = 0; shard < QUEUE_CONFIG.SHARDS; shard++) {
        const queueKey = KEYS.QUEUE_SHARD(shard);
        
        // Get all users in shard
        const userIds = await redis.zRange(queueKey, 0, -1);
        
        for (const userId of userIds) {
          const userData = await redis.get(KEYS.QUEUE_USER(userId));
          if (!userData) {
            // Data expired, remove from sorted set
            await redis.zRem(queueKey, userId);
            removed++;
            continue;
          }

          const user: QueuedUser = JSON.parse(userData);
          if (user.joinedAt < cutoffTime) {
            // User has been waiting too long
            await this.removeFromQueue(userId);
            removed++;
          }
        }
      }

      if (removed > 0) {
        logger.info(`Cleanup removed ${removed} stale queue entries`);
      }
    } catch (error) {
      logger.error('Error during queue cleanup:', error);
    }
  }

  /**
   * Start background cleanup task
   */
  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(
      () => this.cleanup(),
      QUEUE_CONFIG.CLEANUP_INTERVAL_MS
    );
  }

  /**
   * Stop background cleanup task
   */
  stopCleanupTask(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get users in queue count
   */
  async getUsersInQueue(): Promise<number> {
    const stats = await this.getQueueStats();
    return stats.totalInQueue;
  }

  /**
   * Get active matches count
   */
  async getActiveMatches(): Promise<number> {
    const stats = await this.getQueueStats();
    return stats.activeMatches;
  }
}

// Export singleton instance
export const distributedMatchingService = new DistributedMatchingService();
