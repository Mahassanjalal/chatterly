import { User, IUser } from '../models/user.model';
import { logger } from '../config/logger';

interface MatchingUser {
  userId: string;
  socketId: string;
  user: IUser;
  preferences: {
    gender: 'male' | 'female' | 'both';
  };
  joinedAt: Date;
}

interface MatchResult {
  user1: MatchingUser;
  user2: MatchingUser;
  matchId: string;
}

export class MatchingService {
  private waitingUsers: Map<string, MatchingUser> = new Map();
  private activeMatches: Map<string, MatchResult> = new Map();

  async addUserToQueue(userId: string, socketId: string, preferredGender?: 'male' | 'female' | 'both'): Promise<MatchResult | null> {
    try {
      // Get user from database
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Determine preferences based on user type
      let finalPreference: 'male' | 'female' | 'both' | undefined;
      
      if (user.type === 'free') {
        // Free users can only choose 'both' or same gender
        if (preferredGender === 'both' || preferredGender === user.gender) {
          finalPreference = preferredGender;
        } else {
          // Default to 'both' if they try to select opposite gender
          finalPreference = 'both';
        }
      } else {
        // Pro users can choose any preference
        finalPreference = preferredGender || 'both';
      }

      // Create matching user object
      const matchingUser: MatchingUser = {
        userId,
        socketId,
        user,
        preferences: {
          gender: finalPreference || 'both',
        },
        joinedAt: new Date(),
      };

      // Try to find a match
      const match = this.findMatch(matchingUser);
      
      if (match) {
        // Remove the matched user from waiting queue
        this.waitingUsers.delete(match.userId);
        
        // Create match result
        const matchId = this.generateMatchId();
        const matchResult: MatchResult = {
          user1: matchingUser,
          user2: match,
          matchId,
        };

        // Store active match
        this.activeMatches.set(matchId, matchResult);

        logger.info(`Match found: ${userId} <-> ${match.userId}`);
        return matchResult;
      } else {
        // Add user to waiting queue
        this.waitingUsers.set(userId, matchingUser);
        logger.info(`User ${userId} added to waiting queue`);
        return null;
      }
    } catch (error) {
      logger.error('Error adding user to queue:', error);
      throw error;
    }
  }

  private findMatch(newUser: MatchingUser): MatchingUser | null {
    // Collect all compatible users
    const compatibleUsers: MatchingUser[] = [];
    
    for (const [userId, waitingUser] of this.waitingUsers) {
      if (this.areUsersCompatible(newUser, waitingUser)) {
        compatibleUsers.push(waitingUser);
      }
    }

    if (compatibleUsers.length === 0) {
      return null;
    }

    // Apply weighted matching based on user types
    return this.selectWeightedMatch(newUser, compatibleUsers);
  }

  private selectWeightedMatch(newUser: MatchingUser, compatibleUsers: MatchingUser[]): MatchingUser {
    // If only one compatible user, return them
    if (compatibleUsers.length === 1) {
      return compatibleUsers[0];
    }

    // Separate users by gender preference matching
    const sameGenderMatches: MatchingUser[] = [];
    const oppositeGenderMatches: MatchingUser[] = [];
    const otherMatches: MatchingUser[] = [];

    for (const user of compatibleUsers) {
      if (newUser.user.gender && user.user.gender) {
        if (newUser.user.gender === user.user.gender) {
          sameGenderMatches.push(user);
        } else {
          oppositeGenderMatches.push(user);
        }
      } else {
        otherMatches.push(user);
      }
    }

    // Apply weighted selection based on user type
    const random = Math.random();
    
    if (newUser.user.type === 'free') {
      // Free users: 80% same gender, 20% opposite gender
      if (random < 0.8 && sameGenderMatches.length > 0) {
        return sameGenderMatches[Math.floor(Math.random() * sameGenderMatches.length)];
      } else if (oppositeGenderMatches.length > 0) {
        return oppositeGenderMatches[Math.floor(Math.random() * oppositeGenderMatches.length)];
      }
    } else {
      // Pro users: 80% opposite gender, 20% same gender
      if (random < 0.8 && oppositeGenderMatches.length > 0) {
        return oppositeGenderMatches[Math.floor(Math.random() * oppositeGenderMatches.length)];
      } else if (sameGenderMatches.length > 0) {
        return sameGenderMatches[Math.floor(Math.random() * sameGenderMatches.length)];
      }
    }

    // Fallback to any compatible user
    if (otherMatches.length > 0) {
      return otherMatches[Math.floor(Math.random() * otherMatches.length)];
    }

    // Final fallback
    return compatibleUsers[Math.floor(Math.random() * compatibleUsers.length)];
  }

  private areUsersCompatible(user1: MatchingUser, user2: MatchingUser): boolean {
    // Don't match users with themselves
    if (user1.userId === user2.userId) {
      return false;
    }

    // Check if users meet each other's gender preferences
    const user1Compatible = this.doesUserMeetGenderPreference(user2.user, user1.preferences.gender);
    const user2Compatible = this.doesUserMeetGenderPreference(user1.user, user2.preferences.gender);

    return user1Compatible && user2Compatible;
  }

  private doesUserMeetGenderPreference(user: IUser, preferredGender: 'male' | 'female' | 'both'): boolean {
    // If preference is 'both', accept any gender
    if (preferredGender === 'both') {
      return true;
    }

    // If user hasn't specified gender, consider them compatible
    if (!user.gender) {
      return true;
    }

    // Check if user's gender matches the preference
    return user.gender === preferredGender;
  }

  removeUserFromQueue(userId: string): void {
    this.waitingUsers.delete(userId);
    logger.info(`User ${userId} removed from waiting queue`);
  }

  removeUserFromMatch(userId: string): string | null {
    // Find and remove the match containing this user
    for (const [matchId, match] of this.activeMatches) {
      if (match.user1.userId === userId || match.user2.userId === userId) {
        this.activeMatches.delete(matchId);
        logger.info(`Match ${matchId} ended, user ${userId} disconnected`);
        
        // Return the other user's ID so they can be notified
        return match.user1.userId === userId ? match.user2.userId : match.user1.userId;
      }
    }
    return null;
  }

  getMatch(matchId: string): MatchResult | undefined {
    return this.activeMatches.get(matchId);
  }

  getUsersInQueue(): number {
    return this.waitingUsers.size;
  }

  getActiveMatches(): number {
    return this.activeMatches.size;
  }

  getQueueStats(): {
    total: number;
    malePreference: number;
    femalePreference: number;
    bothPreference: number;
  } {
    let malePreference = 0;
    let femalePreference = 0;
    let bothPreference = 0;

    for (const user of this.waitingUsers.values()) {
      switch (user.preferences.gender) {
        case 'male':
          malePreference++;
          break;
        case 'female':
          femalePreference++;
          break;
        case 'both':
          bothPreference++;
          break;
      }
    }

    return {
      total: this.waitingUsers.size,
      malePreference,
      femalePreference,
      bothPreference,
    };
  }

  private generateMatchId(): string {
    return `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Clean up old waiting users (optional - for memory management)
  cleanupOldUsers(maxWaitTimeMinutes: number = 30): void {
    const cutoffTime = new Date(Date.now() - maxWaitTimeMinutes * 60 * 1000);
    
    for (const [userId, user] of this.waitingUsers) {
      if (user.joinedAt < cutoffTime) {
        this.waitingUsers.delete(userId);
        logger.info(`Removed stale user ${userId} from queue`);
      }
    }
  }
}

// Export singleton instance
export const matchingService = new MatchingService();
