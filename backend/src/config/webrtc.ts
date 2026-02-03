import crypto from 'crypto';
import { logger } from './logger';

/**
 * WebRTC Configuration for TURN/STUN servers
 * Provides NAT traversal support for users behind strict firewalls
 */

export interface TurnCredentials {
  username: string;
  credential: string;
  ttl: number;
}

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface WebRTCConfig {
  iceServers: IceServer[];
  iceCandidatePoolSize: number;
  bundlePolicy: 'balanced' | 'max-bundle' | 'max-compat';
  rtcpMuxPolicy: 'negotiate' | 'require';
}

// Quality levels for adaptive bitrate streaming
export interface QualityLevel {
  width: number;
  height: number;
  bitrate: number;
  frameRate: number;
  label: string;
}

export const QUALITY_LEVELS: QualityLevel[] = [
  { width: 320, height: 240, bitrate: 150000, frameRate: 15, label: '240p' },
  { width: 640, height: 480, bitrate: 500000, frameRate: 24, label: '480p' },
  { width: 1280, height: 720, bitrate: 1500000, frameRate: 30, label: '720p' },
  { width: 1920, height: 1080, bitrate: 4000000, frameRate: 30, label: '1080p' },
];

// Default public STUN servers
const DEFAULT_STUN_SERVERS: IceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

/**
 * Generate time-limited TURN credentials for secure relay access
 * Uses HMAC-SHA1 to create credentials that expire after TTL
 */
export function generateTurnCredentials(userId: string): TurnCredentials {
  const turnSecret = process.env.TURN_SECRET || 'default-turn-secret';
  const ttl = parseInt(process.env.TURN_TTL || '86400', 10); // Default 24 hours
  
  const timestamp = Math.floor(Date.now() / 1000) + ttl;
  const username = `${timestamp}:${userId}`;
  
  const credential = crypto
    .createHmac('sha1', turnSecret)
    .update(username)
    .digest('base64');
  
  logger.debug(`Generated TURN credentials for user ${userId}, expires in ${ttl}s`);
  
  return { username, credential, ttl };
}

/**
 * Get WebRTC configuration with optional TURN server support
 * @param userId - User ID for generating TURN credentials
 * @param includeTurn - Whether to include TURN servers (requires TURN_URL env)
 */
export function getWebRTCConfig(userId?: string, includeTurn: boolean = true): WebRTCConfig {
  const iceServers: IceServer[] = [...DEFAULT_STUN_SERVERS];
  
  // Add custom STUN server if configured
  if (process.env.STUN_URL) {
    iceServers.unshift({ urls: process.env.STUN_URL });
  }
  
  // Add TURN servers if configured and requested
  if (includeTurn && process.env.TURN_URL && userId) {
    const credentials = generateTurnCredentials(userId);
    
    // TCP TURN
    iceServers.push({
      urls: process.env.TURN_URL,
      username: credentials.username,
      credential: credentials.credential,
    });
    
    // TLS TURN (if configured)
    if (process.env.TURNS_URL) {
      iceServers.push({
        urls: process.env.TURNS_URL,
        username: credentials.username,
        credential: credentials.credential,
      });
    }
  }
  
  return {
    iceServers,
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  };
}

/**
 * Calculate optimal quality level based on available bandwidth
 * @param availableBandwidth - Estimated bandwidth in bits per second
 * @param maxQuality - Maximum allowed quality level (for non-premium users)
 */
export function getOptimalQualityLevel(
  availableBandwidth: number,
  maxQuality: '480p' | '720p' | '1080p' = '1080p'
): QualityLevel {
  const maxIndex = QUALITY_LEVELS.findIndex(l => l.label === maxQuality);
  const allowedLevels = QUALITY_LEVELS.slice(0, maxIndex + 1);
  
  // Find the highest quality level that fits within 80% of available bandwidth
  // This leaves headroom for network fluctuations
  for (let i = allowedLevels.length - 1; i >= 0; i--) {
    if (allowedLevels[i].bitrate <= availableBandwidth * 0.8) {
      return allowedLevels[i];
    }
  }
  
  // Return lowest quality as fallback
  return QUALITY_LEVELS[0];
}

/**
 * Connection quality thresholds
 */
export const CONNECTION_QUALITY_THRESHOLDS = {
  excellent: { minBandwidth: 2000000, maxLatency: 50, maxPacketLoss: 0.01 },
  good: { minBandwidth: 1000000, maxLatency: 100, maxPacketLoss: 0.03 },
  fair: { minBandwidth: 500000, maxLatency: 200, maxPacketLoss: 0.05 },
  poor: { minBandwidth: 150000, maxLatency: 500, maxPacketLoss: 0.10 },
};

export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';

/**
 * Evaluate connection quality based on metrics
 */
export function evaluateConnectionQuality(
  bandwidth: number,
  latency: number,
  packetLoss: number
): ConnectionQuality {
  if (bandwidth <= 0) return 'disconnected';
  
  for (const [quality, thresholds] of Object.entries(CONNECTION_QUALITY_THRESHOLDS)) {
    if (
      bandwidth >= thresholds.minBandwidth &&
      latency <= thresholds.maxLatency &&
      packetLoss <= thresholds.maxPacketLoss
    ) {
      return quality as ConnectionQuality;
    }
  }
  
  return 'poor';
}

export default {
  getWebRTCConfig,
  generateTurnCredentials,
  getOptimalQualityLevel,
  evaluateConnectionQuality,
  QUALITY_LEVELS,
  CONNECTION_QUALITY_THRESHOLDS,
};
