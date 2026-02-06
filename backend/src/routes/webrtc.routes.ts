import express from 'express';
import rateLimit from 'express-rate-limit';
import { getWebRTCConfig, getOptimalQualityLevel, QUALITY_LEVELS } from '../config/webrtc';
import { subscriptionService } from '../services/subscription.service';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../config/logger';

const router = express.Router();

// Rate limiter for WebRTC routes
const webrtcRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 30, // 30 requests per minute
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiter to all routes
router.use(webrtcRateLimiter);

/**
 * GET /api/webrtc/config
 * Get WebRTC configuration including ICE servers
 */
router.get('/config', authMiddleware, async (req:any, res:any) => {
  try {
    const userId = (req as any).userId;
    const config = getWebRTCConfig(userId, true);
    
    // Get user's subscription to determine max quality
    const subscription = await subscriptionService.getUserSubscription(userId);
    const maxQuality = subscriptionService.getMaxVideoQuality(subscription.plan);
    
    res.json({
      success: true,
      data: {
        ...config,
        maxQuality,
        qualityLevels: QUALITY_LEVELS.filter(l => {
          if (maxQuality === '1080p') return true;
          if (maxQuality === '720p') return l.label !== '1080p';
          return l.label === '240p' || l.label === '480p';
        }),
      },
    });
  } catch (error) {
    logger.error('Error getting WebRTC config:', error);
    res.status(500).json({ success: false, message: 'Failed to get WebRTC config' });
  }
});

/**
 * POST /api/webrtc/optimal-quality
 * Calculate optimal quality based on bandwidth
 */
router.post('/optimal-quality', authMiddleware, async (req:any, res:any) => {
  try {
    const userId = (req as any).userId;
    const { bandwidth } = req.body;

    if (typeof bandwidth !== 'number' || bandwidth < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bandwidth value',
      });
    }

    // Get user's max quality based on subscription
    const subscription = await subscriptionService.getUserSubscription(userId);
    const maxQuality = subscriptionService.getMaxVideoQuality(subscription.plan);
    
    const optimalQuality = getOptimalQualityLevel(bandwidth, maxQuality);
    
    res.json({
      success: true,
      data: {
        optimalQuality,
        constraints: {
          video: {
            width: { ideal: optimalQuality.width },
            height: { ideal: optimalQuality.height },
            frameRate: { ideal: optimalQuality.frameRate },
          },
        },
      },
    });
  } catch (error) {
    logger.error('Error calculating optimal quality:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate optimal quality' });
  }
});

/**
 * GET /api/webrtc/ice-servers
 * Get just the ICE servers (for WebRTC initialization)
 */
router.get('/ice-servers', authMiddleware, async (req:any, res:any) => {
  try {
    const userId = (req as any).userId;
    const config = getWebRTCConfig(userId, true);
    
    res.json({
      success: true,
      data: {
        iceServers: config.iceServers,
        iceCandidatePoolSize: config.iceCandidatePoolSize,
      },
    });
  } catch (error) {
    logger.error('Error getting ICE servers:', error);
    res.status(500).json({ success: false, message: 'Failed to get ICE servers' });
  }
});

export default router;
