import { logger } from '../config/logger';

/**
 * Video Content Moderation Service
 * 
 * Provides AI-based detection of inappropriate video content
 * including NSFW detection, nudity detection, and violence detection.
 * 
 * This service provides the interface for video frame analysis.
 * In production, this would integrate with services like:
 * - AWS Rekognition
 * - Google Cloud Vision
 * - Microsoft Azure Content Moderator
 * - NSFW.js (client-side TensorFlow.js model)
 */

export type VideoModerationCategory = 
  | 'safe'
  | 'nudity'
  | 'suggestive'
  | 'violence'
  | 'hate_symbols'
  | 'unknown';

export interface VideoModerationResult {
  isSafe: boolean;
  category: VideoModerationCategory;
  confidence: number;
  details: {
    nudityScore: number;
    suggestiveScore: number;
    violenceScore: number;
    hateSymbolsScore: number;
  };
  frameTimestamp?: number;
  shouldBlock: boolean;
  shouldWarn: boolean;
}

export interface FrameAnalysisRequest {
  frameData: string; // Base64 encoded image data
  userId: string;
  matchId?: string;
  timestamp: number;
}

// Thresholds for content moderation (exported for testing)
export const MODERATION_THRESHOLDS = {
  block: 0.85,       // Block if any category exceeds this
  warn: 0.60,        // Warn if any category exceeds this
  logOnly: 0.40,     // Log for review if exceeds this
};

// Rate limiting for frame analysis
const FRAME_ANALYSIS_CONFIG = {
  maxFramesPerSecond: 2,
  cooldownMs: 500,
};

class VideoModerationService {
  private lastAnalysisTime: Map<string, number> = new Map();
  private userWarnings: Map<string, number> = new Map();
  private userBlocks: Map<string, number> = new Map();
  
  /**
   * Analyze a video frame for inappropriate content
   * 
   * In production, this would call an external AI service.
   * Currently provides a mock implementation with random safe results.
   */
  async analyzeFrame(request: FrameAnalysisRequest): Promise<VideoModerationResult> {
    const { frameData, userId, matchId, timestamp } = request;
    
    // Rate limiting
    const lastTime = this.lastAnalysisTime.get(userId) || 0;
    const now = Date.now();
    if (now - lastTime < FRAME_ANALYSIS_CONFIG.cooldownMs) {
      return this.createSafeResult();
    }
    this.lastAnalysisTime.set(userId, now);
    
    try {
      // In production, call external AI service here
      // const result = await this.callExternalModerationAPI(frameData);
      
      // Mock implementation - returns safe result
      // Replace with actual AI service integration
      const result = await this.mockAnalysis(frameData);
      
      // Log for monitoring
      if (!result.isSafe) {
        logger.warn('Potentially inappropriate content detected', {
          userId,
          matchId,
          category: result.category,
          confidence: result.confidence,
          timestamp,
        });
        
        // Track warnings and blocks
        if (result.shouldBlock) {
          this.incrementUserBlocks(userId);
        } else if (result.shouldWarn) {
          this.incrementUserWarnings(userId);
        }
      }
      
      return result;
    } catch (error) {
      logger.error('Video moderation analysis failed', { error, userId });
      // On error, return safe to prevent false blocks
      return this.createSafeResult();
    }
  }
  
  /**
   * Batch analyze multiple frames
   */
  async analyzeFrames(frames: FrameAnalysisRequest[]): Promise<VideoModerationResult[]> {
    return Promise.all(frames.map(frame => this.analyzeFrame(frame)));
  }
  
  /**
   * Get user's warning count
   */
  getUserWarnings(userId: string): number {
    return this.userWarnings.get(userId) || 0;
  }
  
  /**
   * Get user's block count
   */
  getUserBlocks(userId: string): number {
    return this.userBlocks.get(userId) || 0;
  }
  
  /**
   * Check if user should be temporarily blocked from video
   */
  shouldBlockUser(userId: string): boolean {
    const blocks = this.getUserBlocks(userId);
    const warnings = this.getUserWarnings(userId);
    
    // Block after 3 blocks or 5 warnings
    return blocks >= 3 || warnings >= 5;
  }
  
  /**
   * Reset user's moderation counts (e.g., after review)
   */
  resetUserCounts(userId: string): void {
    this.userWarnings.delete(userId);
    this.userBlocks.delete(userId);
  }
  
  /**
   * Mock analysis for development/testing
   * In production, replace with actual AI service call
   */
  private async mockAnalysis(_frameData: string): Promise<VideoModerationResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Return safe result 99% of the time (mock)
    // In production, this would be replaced with actual AI analysis
    const random = Math.random();
    
    if (random < 0.99) {
      return this.createSafeResult();
    }
    
    // Simulate detection (1% of the time for testing)
    return {
      isSafe: false,
      category: 'suggestive',
      confidence: 0.65,
      details: {
        nudityScore: 0.45,
        suggestiveScore: 0.65,
        violenceScore: 0.10,
        hateSymbolsScore: 0.05,
      },
      shouldBlock: false,
      shouldWarn: true,
    };
  }
  
  /**
   * Create a safe result object
   */
  private createSafeResult(): VideoModerationResult {
    return {
      isSafe: true,
      category: 'safe',
      confidence: 1.0,
      details: {
        nudityScore: 0.01,
        suggestiveScore: 0.02,
        violenceScore: 0.01,
        hateSymbolsScore: 0.00,
      },
      shouldBlock: false,
      shouldWarn: false,
    };
  }
  
  /**
   * Increment user warning count
   */
  private incrementUserWarnings(userId: string): void {
    const current = this.userWarnings.get(userId) || 0;
    this.userWarnings.set(userId, current + 1);
  }
  
  /**
   * Increment user block count
   */
  private incrementUserBlocks(userId: string): void {
    const current = this.userBlocks.get(userId) || 0;
    this.userBlocks.set(userId, current + 1);
  }
  
  /**
   * Analyze using external API (placeholder for production)
   * 
   * Example integration with AWS Rekognition:
   * 
   * private async callAWSRekognition(frameData: string): Promise<VideoModerationResult> {
   *   const client = new RekognitionClient({ region: 'us-east-1' });
   *   const command = new DetectModerationLabelsCommand({
   *     Image: {
   *       Bytes: Buffer.from(frameData, 'base64'),
   *     },
   *     MinConfidence: 40,
   *   });
   *   const response = await client.send(command);
   *   // Note: Implement parseRekognitionResult to convert AWS response
   *   // to VideoModerationResult format. Parse ModerationLabels from
   *   // response.ModerationLabels and map to appropriate categories.
   *   return this.parseRekognitionResult(response);
   * }
   */
  
  /**
   * Get moderation statistics
   */
  getStats(): {
    totalWarnings: number;
    totalBlocks: number;
    uniqueUsersWarned: number;
    uniqueUsersBlocked: number;
  } {
    let totalWarnings = 0;
    let totalBlocks = 0;
    
    for (const count of this.userWarnings.values()) {
      totalWarnings += count;
    }
    
    for (const count of this.userBlocks.values()) {
      totalBlocks += count;
    }
    
    return {
      totalWarnings,
      totalBlocks,
      uniqueUsersWarned: this.userWarnings.size,
      uniqueUsersBlocked: this.userBlocks.size,
    };
  }
}

// Export singleton instance
export const videoModerationService = new VideoModerationService();
