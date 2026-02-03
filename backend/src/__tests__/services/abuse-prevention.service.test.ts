import { AbusePreventionService } from '../../services/abuse-prevention.service';
import { createMockUser } from '../helpers/mocks';
import { User } from '../../models/user.model';
import { Report } from '../../models/report.model';

// Mock the User model
jest.mock('../../models/user.model', () => ({
  User: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

// Track the save mock
let mockSave = jest.fn().mockResolvedValue(true);

// Mock the Report model
jest.mock('../../models/report.model', () => {
  return {
    Report: jest.fn().mockImplementation(() => ({
      save: mockSave,
    })),
  };
});

// Add count mock to Report
const mockReportFind = jest.fn().mockReturnValue({
  count: jest.fn().mockResolvedValue(0),
});
(Report as any).find = mockReportFind;

// Mock the logger
jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AbusePreventionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSave = jest.fn().mockResolvedValue(true);
  });

  describe('shouldReviewUser', () => {
    it('should return false if user is not found', async () => {
      (User.findById as jest.Mock).mockResolvedValue(null);

      const result = await AbusePreventionService.shouldReviewUser('nonexistent');
      expect(result).toBe(false);
    });

    it('should return true if user has received 3+ reports in last 24 hours', async () => {
      const mockUser = createMockUser({ _id: 'user1' });
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUser);
      
      (Report as any).find = jest.fn().mockReturnValue({
        count: jest.fn().mockResolvedValue(3),
      });

      const result = await AbusePreventionService.shouldReviewUser('user1');
      expect(result).toBe(true);
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user1',
        expect.objectContaining({
          'flags.isUnderReview': true,
          'flags.requiresCaptcha': true,
        })
      );
    });

    it('should return true if user has 5+ warnings', async () => {
      const mockUser = createMockUser({
        _id: 'user1',
        stats: {
          reportCount: 0,
          warningCount: 5,
          connectionCount: 0,
          averageCallDuration: 0,
        },
      });
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUser);
      
      (Report as any).find = jest.fn().mockReturnValue({
        count: jest.fn().mockResolvedValue(0),
      });

      const result = await AbusePreventionService.shouldReviewUser('user1');
      expect(result).toBe(true);
    });

    it('should return true if user has suspiciously low call duration', async () => {
      const mockUser = createMockUser({
        _id: 'user1',
        stats: {
          reportCount: 0,
          warningCount: 0,
          connectionCount: 15, // More than 10 connections
          averageCallDuration: 5, // Less than 10 seconds average
        },
      });
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUser);
      
      (Report as any).find = jest.fn().mockReturnValue({
        count: jest.fn().mockResolvedValue(0),
      });

      const result = await AbusePreventionService.shouldReviewUser('user1');
      expect(result).toBe(true);
    });

    it('should return false for normal users', async () => {
      const mockUser = createMockUser({
        _id: 'user1',
        stats: {
          reportCount: 0,
          warningCount: 0,
          connectionCount: 5,
          averageCallDuration: 120,
        },
      });
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      
      (Report as any).find = jest.fn().mockReturnValue({
        count: jest.fn().mockResolvedValue(1),
      });

      const result = await AbusePreventionService.shouldReviewUser('user1');
      expect(result).toBe(false);
    });
  });

  describe('updateUserStats', () => {
    it('should update user stats after a call', async () => {
      const mockUser = createMockUser({
        _id: 'user1',
        stats: {
          reportCount: 0,
          warningCount: 0,
          connectionCount: 2,
          averageCallDuration: 100,
        },
      });
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUser);

      await AbusePreventionService.updateUserStats('user1', 150);

      // Expected: (100 * 2 + 150) / 3 = 350 / 3 = 116.67
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user1',
        expect.objectContaining({
          $set: {
            'stats.averageCallDuration': expect.any(Number),
            'stats.connectionCount': 3,
          },
        })
      );
    });

    it('should not update if user not found', async () => {
      (User.findById as jest.Mock).mockResolvedValue(null);

      await AbusePreventionService.updateUserStats('nonexistent', 100);

      expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should handle first connection correctly', async () => {
      const mockUser = createMockUser({
        _id: 'user1',
        stats: {
          reportCount: 0,
          warningCount: 0,
          connectionCount: 0,
          averageCallDuration: 0,
        },
      });
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUser);

      await AbusePreventionService.updateUserStats('user1', 120);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user1',
        expect.objectContaining({
          $set: {
            'stats.averageCallDuration': 120,
            'stats.connectionCount': 1,
          },
        })
      );
    });
  });

  describe('handleReport', () => {
    it('should save the report', async () => {
      const mockUser = createMockUser({
        _id: 'user1',
        stats: {
          reportCount: 0,
          warningCount: 0,
          connectionCount: 0,
          averageCallDuration: 0,
        },
      });
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUser);

      const reportData = {
        reportedUserId: 'user1',
        reporterUserId: 'user2',
        reason: 'harassment',
      };

      await AbusePreventionService.handleReport(reportData);

      expect(Report).toHaveBeenCalledWith(reportData);
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user1',
        expect.objectContaining({
          $inc: { 'stats.reportCount': 1 },
        })
      );
    });

    it('should flag user for review if they have 5+ reports', async () => {
      const mockUser = createMockUser({
        _id: 'user1',
        stats: {
          reportCount: 4, // Will become 5 after this report
          warningCount: 0,
          connectionCount: 0,
          averageCallDuration: 0,
        },
      });
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUser);

      await AbusePreventionService.handleReport({
        reportedUserId: 'user1',
        reporterUserId: 'user2',
        reason: 'harassment',
      });

      // Should be called with review flags
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user1',
        expect.objectContaining({
          'flags.isUnderReview': true,
          'flags.requiresCaptcha': true,
        })
      );
    });

    it('should suspend user if they have 10+ reports', async () => {
      const mockUser = createMockUser({
        _id: 'user1',
        stats: {
          reportCount: 9, // Will become 10 after this report
          warningCount: 0,
          connectionCount: 0,
          averageCallDuration: 0,
        },
      });
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUser);

      await AbusePreventionService.handleReport({
        reportedUserId: 'user1',
        reporterUserId: 'user2',
        reason: 'harassment',
      });

      // Should be called with suspension
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user1',
        expect.objectContaining({
          status: 'suspended',
          'restrictions.isSuspended': true,
        })
      );
    });
  });

  describe('issueWarning', () => {
    it('should increment warning count', async () => {
      const mockUser = createMockUser({
        _id: 'user1',
        stats: {
          reportCount: 0,
          warningCount: 0,
          connectionCount: 0,
          averageCallDuration: 0,
        },
      });
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUser);

      await AbusePreventionService.issueWarning('user1', 'Inappropriate content');

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user1',
        expect.objectContaining({
          $inc: { 'stats.warningCount': 1 },
          $set: { 'stats.lastWarningDate': expect.any(Date) },
        })
      );
    });

    it('should suspend user if they have 3+ warnings', async () => {
      const mockUser = createMockUser({
        _id: 'user1',
        stats: {
          reportCount: 0,
          warningCount: 2, // Will become 3 after this warning
          connectionCount: 0,
          averageCallDuration: 0,
        },
      });
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUser);

      await AbusePreventionService.issueWarning('user1', 'Inappropriate content');

      // Should be called with suspension
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user1',
        expect.objectContaining({
          status: 'suspended',
          'restrictions.isSuspended': true,
          'restrictions.suspensionReason': 'Inappropriate content',
        })
      );
    });

    it('should not update if user not found', async () => {
      (User.findById as jest.Mock).mockResolvedValue(null);

      await AbusePreventionService.issueWarning('nonexistent', 'Inappropriate content');

      expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle errors in shouldReviewUser gracefully', async () => {
      (User.findById as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await AbusePreventionService.shouldReviewUser('user1');
      expect(result).toBe(false);
    });

    it('should handle errors in updateUserStats gracefully', async () => {
      (User.findById as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(
        AbusePreventionService.updateUserStats('user1', 100)
      ).resolves.not.toThrow();
    });

    it('should handle errors in handleReport gracefully', async () => {
      mockSave = jest.fn().mockRejectedValue(new Error('Save failed'));

      // Should not throw
      await expect(
        AbusePreventionService.handleReport({
          reportedUserId: 'user1',
          reporterUserId: 'user2',
          reason: 'harassment',
        })
      ).resolves.not.toThrow();
    });
  });
});
