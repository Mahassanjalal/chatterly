import { logger } from '../config/logger';

// bad-words uses CommonJS exports, so we need to use require
// eslint-disable-next-line @typescript-eslint/no-var-requires
import {filter as BadWordsFilter, filter} from '../utils/filter';
// const BadWordsFilter = require('bad-words').then((mod: any) => mod.default || mod);

/**
 * AI-Powered Moderation Service
 * Provides content analysis and toxicity scoring for text and video content
 */

// Toxicity categories and their scores
export interface ToxicityScores {
  toxic: number;
  severeToxic: number;
  threat: number;
  insult: number;
  identityHate: number;
  obscene: number;
  spam: number;
}

export interface TextModerationResult {
  originalText: string;
  sanitizedText: string;
  scores: ToxicityScores;
  action: 'allow' | 'warn' | 'block' | 'review';
  flagged: boolean;
  categories: string[];
  confidence: number;
}

export interface ModerationConfig {
  warnThreshold: number;
  blockThreshold: number;
  reviewThreshold: number;
  maxWarnings: number;
  cooldownPeriod: number; // milliseconds
}

// Pattern-based detection for various categories
const PATTERNS = {
  spam: [
    /\b(buy|sell|cheap|discount|free|click|link|subscribe)\b/gi,
    /https?:\/\/[^\s]+/gi,
    /(.)\1{4,}/g, // Repeated characters
    /(\b\w+\b)(\s+\1){2,}/gi, // Repeated words
  ],
  threats: [
    /\b(kill|murder|hurt|harm|die|death|threat)\b/gi,
    /\b(i('ll| will)\s+(kill|hurt|harm))\b/gi,
  ],
  personalInfo: [
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone numbers
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Emails
    /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, // IP addresses
  ],
  sexual: [
    /\b(sex|nude|naked|porn|xxx)\b/gi,
  ],
  hate: [
    // Placeholders for hate speech patterns - would need careful implementation
  ],
};

// Default configuration
const DEFAULT_CONFIG: ModerationConfig = {
  warnThreshold: 0.6,
  blockThreshold: 0.85,
  reviewThreshold: 0.5,
  maxWarnings: 3,
  cooldownPeriod: 60000, // 1 minute
};

// Filter type interface for bad-words library
interface BadWordsFilterInstance {
  clean(text: string): string;
  isProfane(text: string): boolean;
  addWords(...words: string[]): void;
}

export class AIModerationService {
  private filter: BadWordsFilterInstance;
  private config: ModerationConfig;
  private userWarnings: Map<string, { count: number; lastWarning: number }> = new Map();
  private contextWindow: Map<string, string[]> = new Map();
  private maxContextLength = 10;

  constructor(config: Partial<ModerationConfig> = {}) {
    this.filter = BadWordsFilter as unknown as BadWordsFilterInstance;
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Add custom words to the filter
    this.addCustomWords();
  }

  private addCustomWords(): void {
    // Add platform-specific banned words
    const customBadWords = [
      'kys', // Kill yourself
      'kms', // Kill myself
    ];
    
    try {
      this.filter.addWords(...customBadWords);
    } catch (error) {
      logger.warn('Failed to add custom words to filter:', error);
    }
  }

  /**
   * Analyze text content for toxicity and inappropriate content
   */
  async analyzeText(userId: string, text: string): Promise<TextModerationResult> {
    if (!text || text.trim().length === 0) {
      return this.createAllowResult(text);
    }

    // Add to context window for pattern detection
    this.addToContext(userId, text);

    // Calculate toxicity scores
    const scores = this.calculateToxicityScores(text, userId);
    
    // Determine flagged categories
    const categories = this.detectCategories(text);
    
    // Calculate overall confidence
    const confidence = this.calculateConfidence(scores);
    
    // Determine action based on scores and user history
    const action = this.determineAction(userId, scores, categories);
    
    // Sanitize text if needed
    const sanitizedText = this.sanitizeText(text, action);
    
    // Update user warnings if needed
    if (action === 'warn') {
      this.incrementWarnings(userId);
    }

    const result: TextModerationResult = {
      originalText: text,
      sanitizedText,
      scores,
      action,
      flagged: action !== 'allow',
      categories,
      confidence,
    };

    if (result.flagged) {
      logger.info(`Content flagged for user ${userId}: action=${action}, categories=${categories.join(',')}`);
    }

    return result;
  }

  /**
   * Calculate toxicity scores using pattern matching and heuristics
   */
  private calculateToxicityScores(text: string, userId: string): ToxicityScores {
    const lowerText = text.toLowerCase();
    const context = this.getContext(userId);
    const fullContext = [...context, text].join(' ').toLowerCase();
    
    // Check for profanity using the filter
    const hasProfanity = this.filter.isProfane(text);
    
    // Pattern-based scoring
    const spamScore = this.calculatePatternScore(fullContext, PATTERNS.spam);
    const threatScore = this.calculatePatternScore(lowerText, PATTERNS.threats);
    const sexualScore = this.calculatePatternScore(lowerText, PATTERNS.sexual);
    const hasPersonalInfo = this.calculatePatternScore(text, PATTERNS.personalInfo) > 0;
    
    // Calculate various scores
    const scores: ToxicityScores = {
      toxic: hasProfanity ? 0.7 : Math.min(spamScore + threatScore, 1),
      severeToxic: threatScore > 0.5 ? 0.8 : 0,
      threat: threatScore,
      insult: hasProfanity ? 0.6 : 0,
      identityHate: 0, // Would need more sophisticated NLP
      obscene: sexualScore > 0 ? 0.8 : (hasProfanity ? 0.5 : 0),
      spam: spamScore + (hasPersonalInfo ? 0.3 : 0),
    };

    // Apply context multiplier for repeated offenses
    const contextMultiplier = this.getContextMultiplier(userId);
    Object.keys(scores).forEach(key => {
      scores[key as keyof ToxicityScores] = Math.min(
        scores[key as keyof ToxicityScores] * contextMultiplier,
        1
      );
    });

    return scores;
  }

  /**
   * Calculate pattern match score
   */
  private calculatePatternScore(text: string, patterns: RegExp[]): number {
    let matches = 0;
    for (const pattern of patterns) {
      const found = text.match(pattern);
      if (found) {
        matches += found.length;
      }
    }
    return Math.min(matches * 0.3, 1);
  }

  /**
   * Detect content categories
   */
  private detectCategories(text: string): string[] {
    const categories: string[] = [];
    const lowerText = text.toLowerCase();

    if (this.filter.isProfane(text)) {
      categories.push('profanity');
    }
    if (this.calculatePatternScore(lowerText, PATTERNS.spam) > 0.3) {
      categories.push('spam');
    }
    if (this.calculatePatternScore(lowerText, PATTERNS.threats) > 0) {
      categories.push('threats');
    }
    if (this.calculatePatternScore(text, PATTERNS.personalInfo) > 0) {
      categories.push('personal_info');
    }
    if (this.calculatePatternScore(lowerText, PATTERNS.sexual) > 0) {
      categories.push('sexual');
    }

    return categories;
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidence(scores: ToxicityScores): number {
    const values = Object.values(scores);
    const maxScore = Math.max(...values);
    return maxScore;
  }

  /**
   * Determine moderation action based on scores and user history
   */
  private determineAction(
    userId: string,
    scores: ToxicityScores,
    categories: string[]
  ): 'allow' | 'warn' | 'block' | 'review' {
    const maxScore = Math.max(...Object.values(scores));
    const userWarningData = this.userWarnings.get(userId);
    const warningCount = userWarningData?.count || 0;

    // Immediate block for severe content
    if (scores.severeToxic >= this.config.blockThreshold || 
        scores.threat >= this.config.blockThreshold) {
      return 'block';
    }

    // Block after max warnings
    if (warningCount >= this.config.maxWarnings && maxScore >= this.config.warnThreshold) {
      return 'block';
    }

    // Warning threshold
    if (maxScore >= this.config.warnThreshold) {
      return 'warn';
    }

    // Review threshold
    if (maxScore >= this.config.reviewThreshold || categories.includes('personal_info')) {
      return 'review';
    }

    return 'allow';
  }

  /**
   * Sanitize text based on action
   */
  private sanitizeText(text: string, action: 'allow' | 'warn' | 'block' | 'review'): string {
    if (action === 'block') {
      return '[Message blocked by moderation]';
    }

    // Clean profanity for warn and review actions
    if (action === 'warn' || action === 'review') {
      try {
        return this.filter.clean(text);
      } catch {
        return text;
      }
    }

    return text;
  }

  /**
   * Add message to user's context window
   */
  private addToContext(userId: string, text: string): void {
    if (!this.contextWindow.has(userId)) {
      this.contextWindow.set(userId, []);
    }
    
    const context = this.contextWindow.get(userId)!;
    context.push(text);
    
    // Keep only recent messages
    if (context.length > this.maxContextLength) {
      context.shift();
    }
  }

  /**
   * Get user's context window
   */
  private getContext(userId: string): string[] {
    return this.contextWindow.get(userId) || [];
  }

  /**
   * Get context multiplier based on recent behavior
   */
  private getContextMultiplier(userId: string): number {
    const warningData = this.userWarnings.get(userId);
    if (!warningData) return 1;

    // Increase scrutiny for users with warnings
    const baseMultiplier = 1 + (warningData.count * 0.2);
    
    // Reduce multiplier if cooldown period has passed
    const timeSinceWarning = Date.now() - warningData.lastWarning;
    if (timeSinceWarning > this.config.cooldownPeriod * 5) {
      return 1;
    }

    return Math.min(baseMultiplier, 2);
  }

  /**
   * Increment user warnings
   */
  private incrementWarnings(userId: string): void {
    const existing = this.userWarnings.get(userId);
    this.userWarnings.set(userId, {
      count: (existing?.count || 0) + 1,
      lastWarning: Date.now(),
    });
  }

  /**
   * Create a default allow result
   */
  private createAllowResult(text: string): TextModerationResult {
    return {
      originalText: text,
      sanitizedText: text,
      scores: {
        toxic: 0,
        severeToxic: 0,
        threat: 0,
        insult: 0,
        identityHate: 0,
        obscene: 0,
        spam: 0,
      },
      action: 'allow',
      flagged: false,
      categories: [],
      confidence: 0,
    };
  }

  /**
   * Clear user warnings (e.g., after a period of good behavior)
   */
  clearUserWarnings(userId: string): void {
    this.userWarnings.delete(userId);
    this.contextWindow.delete(userId);
  }

  /**
   * Get user warning count
   */
  getUserWarningCount(userId: string): number {
    return this.userWarnings.get(userId)?.count || 0;
  }

  /**
   * Check if a user should be rate-limited
   */
  shouldRateLimitUser(userId: string): boolean {
    const warningData = this.userWarnings.get(userId);
    if (!warningData) return false;

    const timeSinceWarning = Date.now() - warningData.lastWarning;
    return warningData.count >= 2 && timeSinceWarning < this.config.cooldownPeriod;
  }
}

// Export singleton instance
export const aiModerationService = new AIModerationService();
