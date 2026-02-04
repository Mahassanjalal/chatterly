import { ModerationService } from '../../services/moderation.service';

// Mock the logger
jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('ModerationService', () => {
  let moderationService: ModerationService;

  beforeEach(() => {
    moderationService = new ModerationService();
  });

  describe('cleanMessage', () => {
    it('should replace profanity with asterisks', () => {
      const result = moderationService.cleanMessage('This is a damn test');
      expect(result).not.toContain('damn');
      expect(result).toContain('****');
    });

    it('should return empty string for null/undefined input', () => {
      expect(moderationService.cleanMessage('')).toBe('');
      expect(moderationService.cleanMessage(null as unknown as string)).toBe('');
      expect(moderationService.cleanMessage(undefined as unknown as string)).toBe('');
    });

    it('should leave clean messages unchanged', () => {
      const cleanMessage = 'Hello, how are you today?';
      const result = moderationService.cleanMessage(cleanMessage);
      expect(result).toBe(cleanMessage);
    });

    it('should handle multiple profane words', () => {
      const result = moderationService.cleanMessage('This shit is damn bad');
      expect(result).not.toContain('shit');
      expect(result).not.toContain('damn');
    });

    it('should handle messages with mixed case profanity', () => {
      const result = moderationService.cleanMessage('This is DAMN bad');
      // The filter should handle case-insensitive filtering
      expect(result.toLowerCase()).not.toContain('damn');
    });
  });

  describe('isProfane', () => {
    it('should return true for messages containing profanity', () => {
      expect(moderationService.isProfane('This is a damn test')).toBe(true);
      expect(moderationService.isProfane('What the shit')).toBe(true);
    });

    it('should return false for clean messages', () => {
      expect(moderationService.isProfane('Hello, how are you?')).toBe(false);
      expect(moderationService.isProfane('This is a nice day')).toBe(false);
    });

    it('should return false for empty/null input', () => {
      expect(moderationService.isProfane('')).toBe(false);
      expect(moderationService.isProfane(null as unknown as string)).toBe(false);
      expect(moderationService.isProfane(undefined as unknown as string)).toBe(false);
    });

    it('should handle special characters around profanity', () => {
      expect(moderationService.isProfane('!@#damn$%^')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle very long messages', () => {
      const longMessage = 'This is a clean message. '.repeat(1000);
      const result = moderationService.cleanMessage(longMessage);
      expect(result).toBe(longMessage);
    });

    it('should handle Unicode characters', () => {
      const unicodeMessage = 'Hello 你好 مرحبا שלום';
      const result = moderationService.cleanMessage(unicodeMessage);
      expect(result).toBe(unicodeMessage);
    });

    it('should handle emojis', () => {
      const emojiMessage = 'Hello 😀 World 🌍';
      const result = moderationService.cleanMessage(emojiMessage);
      expect(result).toBe(emojiMessage);
    });

    it('should handle messages with only whitespace', () => {
      const result = moderationService.cleanMessage('   ');
      expect(result).toBe('   ');
    });

    it('should handle messages with newlines', () => {
      const multilineMessage = 'Hello\nWorld\nHow\nAre\nYou';
      const result = moderationService.cleanMessage(multilineMessage);
      expect(result).toBe(multilineMessage);
    });
  });

  describe('consistency', () => {
    it('should produce consistent results for the same input', () => {
      const message = 'This is a damn test';
      const result1 = moderationService.cleanMessage(message);
      const result2 = moderationService.cleanMessage(message);
      expect(result1).toBe(result2);
    });

    it('should match isProfane and cleanMessage results', () => {
      const profaneMessage = 'This is a damn test';
      const cleanMessageText = 'This is a nice test';

      expect(moderationService.isProfane(profaneMessage)).toBe(true);
      expect(moderationService.isProfane(cleanMessageText)).toBe(false);

      const cleanedProfane = moderationService.cleanMessage(profaneMessage);
      const cleanedClean = moderationService.cleanMessage(cleanMessageText);

      expect(cleanedProfane).not.toBe(profaneMessage);
      expect(cleanedClean).toBe(cleanMessageText);
    });
  });
});
