import { User, IUser } from '../models/user.model';
import { logger } from '../config/logger';

/**
 * Advanced Matching Service
 * Implements interest-based matching, priority matching for premium users,
 * and scoring algorithms for optimal match quality
 */

// User preferences for matching
export interface MatchingPreferences {
  gender: 'male' | 'female' | 'both';
  interests?: string[];
  region?: string;
  ageRange?: { min: number; max: number };
  language?: string;
}

// Extended matching user interface
interface AdvancedMatchingUser {
  userId: string;
  socketId: string;
  user: IUser;
  preferences: MatchingPreferences;
  joinedAt: Date;
  priority: number; // Higher = matched sooner
  matchScore?: number;
  region?: string;
  interests?: string[];
}

interface MatchResult {
  user1: AdvancedMatchingUser;
  user2: AdvancedMatchingUser;
  matchId: string;
  matchScore: number;
  matchedAt: Date;
}

// Match scoring weights
const SCORING_WEIGHTS = {
  genderPreference: 0.30,
  interests: 0.25,
  region: 0.15,
  waitTime: 0.15,
  reputation: 0.10,
  ageCompatibility: 0.05,
};

// Premium user priority bonus
const PRIORITY_BONUSES = {
  free: 0,
  pro: 100,
  plus: 50,
};

export class AdvancedMatchingService {
  private waitingUsers: Map<string, AdvancedMatchingUser> = new Map();
  private activeMatches: Map<string, MatchResult> = new Map();
  private userMatchHistory: Map<string, Set<string>> = new Map();
  
  // Analytics tracking
  private matchMetrics = {
    totalMatches: 0,
    averageWaitTime: 0,
    averageMatchScore: 0,
    matchesByRegion: new Map<string, number>(),
  };

  /**
   * Add user to matching queue with advanced preferences
   */
  async addUserToQueue(
    userId: string,
    socketId: string,
    preferences: Partial<MatchingPreferences> = {}
  ): Promise<MatchResult | null> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Determine final preferences based on user type
      const finalPreferences = this.normalizePreferences(user, preferences);
      
      // Calculate priority based on user type
      const priority = this.calculatePriority(user);

      const matchingUser: AdvancedMatchingUser = {
        userId,
        socketId,
        user,
        preferences: finalPreferences,
        joinedAt: new Date(),
        priority,
        region: preferences.region,
        interests: preferences.interests || [],
      };

      // Try to find a match with scoring
      const match = await this.findBestMatch(matchingUser);

      if (match) {
        // Remove matched user from queue
        this.waitingUsers.delete(match.userId);

        // Generate match ID
        const matchId = this.generateMatchId();
        
        // Calculate final match score
        const matchScore = this.calculateMatchScore(matchingUser, match);

        const matchResult: MatchResult = {
          user1: matchingUser,
          user2: match,
          matchId,
          matchScore,
          matchedAt: new Date(),
        };

        // Store active match
        this.activeMatches.set(matchId, matchResult);

        // Update match history
        this.updateMatchHistory(userId, match.userId);

        // Update metrics
        this.updateMatchMetrics(matchResult);

        logger.info(
          `Match found: ${userId} <-> ${match.userId} (score: ${matchScore.toFixed(2)}, priority: ${matchingUser.priority}/${match.priority})`
        );

        return matchResult;
      }

      // No match found, add to queue
      this.waitingUsers.set(userId, matchingUser);
      logger.info(`User ${userId} added to queue (priority: ${priority}, preferences: ${JSON.stringify(finalPreferences)})`);
      
      return null;
    } catch (error) {
      logger.error('Error in addUserToQueue:', error);
      throw error;
    }
  }

  /**
   * Normalize preferences based on user type
   * Free users: Can select 'both' or same-gender only (opposite-gender filter is premium)
   * Pro users: Full preference selection including opposite-gender filter
   */
  private normalizePreferences(user: IUser, preferences: Partial<MatchingPreferences>): MatchingPreferences {
    const defaultPreferences: MatchingPreferences = {
      gender: 'both',
    };

    // Free users have limited preferences:
    // They can choose 'both' or same-gender matching
    // Selecting opposite-gender specifically is a premium feature
    if (user.type === 'free') {
      const canUsePreference = 
        preferences.gender === 'both' || 
        preferences.gender === user.gender;
      
      return {
        gender: canUsePreference ? (preferences.gender || 'both') : 'both',
      };
    }

    // Pro users get full preferences
    return {
      ...defaultPreferences,
      ...preferences,
      gender: preferences.gender || 'both',
    };
  }

  /**
   * Calculate user priority for matching queue
   */
  private calculatePriority(user: IUser): number {
    let priority = PRIORITY_BONUSES[user.type as keyof typeof PRIORITY_BONUSES] || 0;
    
    // Bonus for verified email
    if (user.flags?.isEmailVerified) {
      priority += 10;
    }

    // Penalty for high report count
    if (user.stats?.reportCount > 0) {
      priority -= user.stats.reportCount * 5;
    }

    // Bonus for good behavior (low warning count)
    if (user.stats?.warningCount === 0 && user.stats?.connectionCount > 10) {
      priority += 20;
    }

    return Math.max(priority, 0);
  }

  /**
   * Find the best match from waiting users using scoring algorithm
   */
  private async findBestMatch(newUser: AdvancedMatchingUser): Promise<AdvancedMatchingUser | null> {
    const candidates: Array<{ user: AdvancedMatchingUser; score: number }> = [];

    for (const [userId, waitingUser] of this.waitingUsers) {
      // Skip self
      if (userId === newUser.userId) continue;

      // Check basic compatibility
      if (!this.areUsersCompatible(newUser, waitingUser)) continue;

      // Skip recently matched users
      if (this.hasRecentlyMatched(newUser.userId, userId)) continue;

      // Calculate match score
      const score = this.calculateMatchScore(newUser, waitingUser);
      candidates.push({ user: waitingUser, score });
    }

    if (candidates.length === 0) return null;

    // Sort by score and priority
    candidates.sort((a, b) => {
      const scoreA = a.score + (a.user.priority / 1000);
      const scoreB = b.score + (b.user.priority / 1000);
      return scoreB - scoreA;
    });

    // Apply exploration vs exploitation strategy
    // 90% of the time, choose the best match
    // 10% of the time, introduce some randomness for diversity
    if (Math.random() < 0.1 && candidates.length > 1) {
      const randomIndex = Math.floor(Math.random() * Math.min(3, candidates.length));
      return candidates[randomIndex].user;
    }

    return candidates[0].user;
  }

  /**
   * Calculate compatibility score between two users
   */
  private calculateMatchScore(user1: AdvancedMatchingUser, user2: AdvancedMatchingUser): number {
    let score = 0;

    // Gender preference score
    const genderScore = this.calculateGenderScore(user1, user2);
    score += genderScore * SCORING_WEIGHTS.genderPreference;

    // Interest similarity score
    const interestScore = this.calculateInterestScore(user1.interests, user2.interests);
    score += interestScore * SCORING_WEIGHTS.interests;

    // Region score
    const regionScore = this.calculateRegionScore(user1.region, user2.region);
    score += regionScore * SCORING_WEIGHTS.region;

    // Wait time fairness score (favor users who have been waiting longer)
    const waitScore = this.calculateWaitTimeScore(user1, user2);
    score += waitScore * SCORING_WEIGHTS.waitTime;

    // Reputation score
    const reputationScore = this.calculateReputationScore(user1.user, user2.user);
    score += reputationScore * SCORING_WEIGHTS.reputation;

    // Age compatibility score
    const ageScore = this.calculateAgeCompatibility(user1, user2);
    score += ageScore * SCORING_WEIGHTS.ageCompatibility;

    return Math.min(score, 1);
  }

  /**
   * Calculate gender preference match score
   */
  private calculateGenderScore(user1: AdvancedMatchingUser, user2: AdvancedMatchingUser): number {
    const pref1Match = user1.preferences.gender === 'both' || 
                       user1.preferences.gender === user2.user.gender;
    const pref2Match = user2.preferences.gender === 'both' || 
                       user2.preferences.gender === user1.user.gender;

    if (pref1Match && pref2Match) return 1;
    if (pref1Match || pref2Match) return 0.5;
    return 0;
  }

  /**
   * Calculate interest similarity using Jaccard index
   */
  private calculateInterestScore(interests1?: string[], interests2?: string[]): number {
    if (!interests1?.length || !interests2?.length) return 0.5; // Neutral if no interests

    const set1 = new Set(interests1.map(i => i.toLowerCase()));
    const set2 = new Set(interests2.map(i => i.toLowerCase()));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    if (union.size === 0) return 0.5;
    return intersection.size / union.size;
  }

  /**
   * Calculate region matching score
   */
  private calculateRegionScore(region1?: string, region2?: string): number {
    if (!region1 || !region2) return 0.5;
    return region1 === region2 ? 1 : 0.3;
  }

  /**
   * Calculate wait time fairness score
   */
  private calculateWaitTimeScore(user1: AdvancedMatchingUser, user2: AdvancedMatchingUser): number {
    const maxWaitTime = 120000; // 2 minutes max consideration
    const waitTime = Date.now() - user2.joinedAt.getTime();
    return Math.min(waitTime / maxWaitTime, 1);
  }

  /**
   * Calculate reputation score based on user stats
   */
  private calculateReputationScore(user1: IUser, user2: IUser): number {
    const getReputation = (user: IUser): number => {
      let rep = 1;
      if (user.stats?.reportCount) rep -= user.stats.reportCount * 0.1;
      if (user.stats?.warningCount) rep -= user.stats.warningCount * 0.15;
      if (user.flags?.isEmailVerified) rep += 0.1;
      return Math.max(0, Math.min(1, rep));
    };

    return (getReputation(user1) + getReputation(user2)) / 2;
  }

  /**
   * Calculate age compatibility score
   */
  private calculateAgeCompatibility(user1: AdvancedMatchingUser, user2: AdvancedMatchingUser): number {
    const dob1 = user1.user.dateOfBirth;
    const dob2 = user2.user.dateOfBirth;
    
    if (!dob1 || !dob2) return 0.5;

    const age1 = this.calculateAge(new Date(dob1));
    const age2 = this.calculateAge(new Date(dob2));
    
    const ageDiff = Math.abs(age1 - age2);
    
    // Score decreases with age difference
    if (ageDiff <= 3) return 1;
    if (ageDiff <= 5) return 0.8;
    if (ageDiff <= 10) return 0.6;
    return 0.3;
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dob: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Check if users have recently been matched
   */
  private hasRecentlyMatched(userId1: string, userId2: string): boolean {
    const history = this.userMatchHistory.get(userId1);
    return history?.has(userId2) || false;
  }

  /**
   * Update match history
   */
  private updateMatchHistory(userId1: string, userId2: string): void {
    if (!this.userMatchHistory.has(userId1)) {
      this.userMatchHistory.set(userId1, new Set());
    }
    if (!this.userMatchHistory.has(userId2)) {
      this.userMatchHistory.set(userId2, new Set());
    }
    
    this.userMatchHistory.get(userId1)!.add(userId2);
    this.userMatchHistory.get(userId2)!.add(userId1);

    // Clear old history entries periodically
    setTimeout(() => {
      this.userMatchHistory.get(userId1)?.delete(userId2);
      this.userMatchHistory.get(userId2)?.delete(userId1);
    }, 1800000); // 30 minutes
  }

  /**
   * Update matching metrics
   */
  private updateMatchMetrics(match: MatchResult): void {
    this.matchMetrics.totalMatches++;
    
    const waitTime = match.matchedAt.getTime() - match.user2.joinedAt.getTime();
    this.matchMetrics.averageWaitTime = 
      (this.matchMetrics.averageWaitTime * (this.matchMetrics.totalMatches - 1) + waitTime) /
      this.matchMetrics.totalMatches;
    
    this.matchMetrics.averageMatchScore =
      (this.matchMetrics.averageMatchScore * (this.matchMetrics.totalMatches - 1) + match.matchScore) /
      this.matchMetrics.totalMatches;
    
    if (match.user1.region) {
      const regionCount = this.matchMetrics.matchesByRegion.get(match.user1.region) || 0;
      this.matchMetrics.matchesByRegion.set(match.user1.region, regionCount + 1);
    }
  }

  /**
   * Check basic compatibility between users
   */
  private areUsersCompatible(user1: AdvancedMatchingUser, user2: AdvancedMatchingUser): boolean {
    // Don't match with self
    if (user1.userId === user2.userId) return false;

    // Check mutual gender preferences
    const pref1Match = user1.preferences.gender === 'both' || 
                       user1.preferences.gender === user2.user.gender;
    const pref2Match = user2.preferences.gender === 'both' || 
                       user2.preferences.gender === user1.user.gender;

    return pref1Match && pref2Match;
  }

  /**
   * Remove user from queue
   */
  removeUserFromQueue(userId: string): void {
    this.waitingUsers.delete(userId);
  }

  /**
   * Remove user from active match
   */
  removeUserFromMatch(userId: string): string | null {
    for (const [matchId, match] of this.activeMatches) {
      if (match.user1.userId === userId || match.user2.userId === userId) {
        this.activeMatches.delete(matchId);
        return match.user1.userId === userId ? match.user2.userId : match.user1.userId;
      }
    }
    return null;
  }

  /**
   * Get match by ID
   */
  getMatch(matchId: string): MatchResult | undefined {
    return this.activeMatches.get(matchId);
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    let malePreference = 0;
    let femalePreference = 0;
    let bothPreference = 0;
    let proUsers = 0;

    for (const user of this.waitingUsers.values()) {
      switch (user.preferences.gender) {
        case 'male': malePreference++; break;
        case 'female': femalePreference++; break;
        case 'both': bothPreference++; break;
      }
      if (user.user.type === 'pro') proUsers++;
    }

    return {
      total: this.waitingUsers.size,
      malePreference,
      femalePreference,
      bothPreference,
      proUsers,
      activeMatches: this.activeMatches.size,
    };
  }

  /**
   * Get matching metrics
   */
  getMetrics() {
    return {
      ...this.matchMetrics,
      matchesByRegion: Object.fromEntries(this.matchMetrics.matchesByRegion),
    };
  }

  /**
   * Generate unique match ID
   */
  private generateMatchId(): string {
    return `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup stale users from queue
   */
  cleanupStaleUsers(maxWaitMinutes: number = 30): void {
    const cutoff = new Date(Date.now() - maxWaitMinutes * 60 * 1000);
    for (const [userId, user] of this.waitingUsers) {
      if (user.joinedAt < cutoff) {
        this.waitingUsers.delete(userId);
        logger.info(`Removed stale user ${userId} from queue`);
      }
    }
  }

  /**
   * Get number of users in queue
   */
  getUsersInQueue(): number {
    return this.waitingUsers.size;
  }

  /**
   * Get number of active matches
   */
  getActiveMatches(): number {
    return this.activeMatches.size;
  }
}

// Export singleton instance
export const advancedMatchingService = new AdvancedMatchingService();
