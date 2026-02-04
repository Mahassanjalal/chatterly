import { MatchingService } from '../../services/matching.service';
import { createMockUser } from '../helpers/mocks';
import { User } from '../../models/user.model';

// Mock the User model
jest.mock('../../models/user.model', () => ({
  User: {
    findById: jest.fn(),
  },
}));

// Mock the logger
jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('MatchingService', () => {
  let matchingService: MatchingService;

  beforeEach(() => {
    matchingService = new MatchingService();
    jest.clearAllMocks();
  });

  describe('addUserToQueue', () => {
    it('should add a user to the queue when no match is available', async () => {
      const mockUser = createMockUser({ type: 'free', gender: 'male' });
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await matchingService.addUserToQueue('user1', 'socket1', 'both');

      expect(result).toBeNull();
      expect(matchingService.getUsersInQueue()).toBe(1);
    });

    it('should match two compatible users', async () => {
      const user1 = createMockUser({ _id: 'user1', type: 'free', gender: 'male' });
      const user2 = createMockUser({ _id: 'user2', type: 'free', gender: 'female' });

      (User.findById as jest.Mock)
        .mockResolvedValueOnce(user1)
        .mockResolvedValueOnce(user2);

      // Add first user to queue
      const result1 = await matchingService.addUserToQueue('user1', 'socket1', 'both');
      expect(result1).toBeNull();

      // Add second user - should match
      const result2 = await matchingService.addUserToQueue('user2', 'socket2', 'both');
      expect(result2).not.toBeNull();
      expect(result2?.user1.userId).toBe('user2');
      expect(result2?.user2.userId).toBe('user1');
    });

    it('should throw error if user not found', async () => {
      (User.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        matchingService.addUserToQueue('nonexistent', 'socket1')
      ).rejects.toThrow('User not found');
    });

    it('should apply gender preference restrictions for free users', async () => {
      const freeUser = createMockUser({
        _id: 'freeUser',
        type: 'free',
        gender: 'male',
      });

      (User.findById as jest.Mock).mockResolvedValue(freeUser);

      // Free user tries to select opposite gender - should default to 'both'
      await matchingService.addUserToQueue('freeUser', 'socket1', 'female');
      
      const stats = matchingService.getQueueStats();
      expect(stats.bothPreference).toBe(1);
    });

    it('should allow pro users to select any gender preference', async () => {
      const proUser = createMockUser({
        _id: 'proUser',
        type: 'pro',
        gender: 'male',
      });

      (User.findById as jest.Mock).mockResolvedValue(proUser);

      await matchingService.addUserToQueue('proUser', 'socket1', 'female');
      
      const stats = matchingService.getQueueStats();
      expect(stats.femalePreference).toBe(1);
    });
  });

  describe('removeUserFromQueue', () => {
    it('should remove a user from the queue', async () => {
      const mockUser = createMockUser({ _id: 'user1', type: 'free' });
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await matchingService.addUserToQueue('user1', 'socket1');
      expect(matchingService.getUsersInQueue()).toBe(1);

      matchingService.removeUserFromQueue('user1');
      expect(matchingService.getUsersInQueue()).toBe(0);
    });
  });

  describe('removeUserFromMatch', () => {
    it('should remove an active match and return the other user ID', async () => {
      const user1 = createMockUser({ _id: 'user1', type: 'free', gender: 'male' });
      const user2 = createMockUser({ _id: 'user2', type: 'free', gender: 'female' });

      (User.findById as jest.Mock)
        .mockResolvedValueOnce(user1)
        .mockResolvedValueOnce(user2);

      await matchingService.addUserToQueue('user1', 'socket1', 'both');
      await matchingService.addUserToQueue('user2', 'socket2', 'both');

      expect(matchingService.getActiveMatches()).toBe(1);

      const otherUserId = matchingService.removeUserFromMatch('user1');
      expect(otherUserId).toBe('user2');
      expect(matchingService.getActiveMatches()).toBe(0);
    });

    it('should return null if user is not in any match', () => {
      const result = matchingService.removeUserFromMatch('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getQueueStats', () => {
    it('should return correct statistics', async () => {
      const user1 = createMockUser({ _id: 'user1', type: 'pro', gender: 'male' });
      const user2 = createMockUser({ _id: 'user2', type: 'pro', gender: 'female' });
      const user3 = createMockUser({ _id: 'user3', type: 'free', gender: 'male' });

      (User.findById as jest.Mock)
        .mockResolvedValueOnce(user1)
        .mockResolvedValueOnce(user2)
        .mockResolvedValueOnce(user3);

      await matchingService.addUserToQueue('user1', 'socket1', 'female');
      await matchingService.addUserToQueue('user2', 'socket2', 'male');

      // These should match
      expect(matchingService.getUsersInQueue()).toBe(0);

      // Add another user
      await matchingService.addUserToQueue('user3', 'socket3', 'both');
      
      const stats = matchingService.getQueueStats();
      expect(stats.total).toBe(1);
      expect(stats.bothPreference).toBe(1);
    });
  });

  describe('cleanupOldUsers', () => {
    it('should not remove users who have been waiting for less than max time', async () => {
      const mockUser = createMockUser({ _id: 'user1', type: 'free' });
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await matchingService.addUserToQueue('user1', 'socket1');
      expect(matchingService.getUsersInQueue()).toBe(1);

      // Try to cleanup with 30 minute threshold - user should still be there
      matchingService.cleanupOldUsers(30);
      expect(matchingService.getUsersInQueue()).toBe(1);
    });

    it('should verify cleanup method exists and is callable', () => {
      // Verify the method exists and can be called without error
      expect(typeof matchingService.cleanupOldUsers).toBe('function');
      expect(() => matchingService.cleanupOldUsers(30)).not.toThrow();
    });
  });

  describe('compatibility matching', () => {
    it('should not match a user with themselves', async () => {
      const mockUser = createMockUser({ _id: 'user1', type: 'free' });
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await matchingService.addUserToQueue('user1', 'socket1');
      
      // Try to add same user again
      await matchingService.addUserToQueue('user1', 'socket2');
      
      // Should still be 1 since they can't match with themselves
      // But will replace in queue since it's same userId
      expect(matchingService.getUsersInQueue()).toBe(1);
    });

    it('should match users based on gender preferences', async () => {
      const maleUser = createMockUser({ _id: 'male1', type: 'pro', gender: 'male' });
      const femaleUser = createMockUser({ _id: 'female1', type: 'pro', gender: 'female' });

      (User.findById as jest.Mock)
        .mockResolvedValueOnce(maleUser)
        .mockResolvedValueOnce(femaleUser);

      // Male prefers female
      await matchingService.addUserToQueue('male1', 'socket1', 'female');
      
      // Female prefers male - should match
      const result = await matchingService.addUserToQueue('female1', 'socket2', 'male');
      
      expect(result).not.toBeNull();
    });

    it('should not match users with incompatible gender preferences', async () => {
      const maleUser1 = createMockUser({ _id: 'male1', type: 'pro', gender: 'male' });
      const maleUser2 = createMockUser({ _id: 'male2', type: 'pro', gender: 'male' });

      (User.findById as jest.Mock)
        .mockResolvedValueOnce(maleUser1)
        .mockResolvedValueOnce(maleUser2);

      // Male1 prefers female
      await matchingService.addUserToQueue('male1', 'socket1', 'female');
      
      // Male2 also prefers female - should NOT match
      const result = await matchingService.addUserToQueue('male2', 'socket2', 'female');
      
      expect(result).toBeNull();
      expect(matchingService.getUsersInQueue()).toBe(2);
    });
  });
});
