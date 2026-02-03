import express from 'express';
import { subscriptionService, PlanType } from '../services/subscription.service';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../config/logger';

const router = express.Router();

/**
 * GET /api/subscription/plans
 * Get all available subscription plans
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = subscriptionService.getAvailablePlans();
    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    logger.error('Error getting plans:', error);
    res.status(500).json({ success: false, message: 'Failed to get plans' });
  }
});

/**
 * GET /api/subscription/status
 * Get current user's subscription status
 */
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const status = await subscriptionService.getUserSubscription(userId);
    
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error('Error getting subscription status:', error);
    res.status(500).json({ success: false, message: 'Failed to get subscription status' });
  }
});

/**
 * GET /api/subscription/features
 * Get feature gates for current user
 */
router.get('/features', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const subscription = await subscriptionService.getUserSubscription(userId);
    const featureGates = subscriptionService.getFeatureGates(subscription.plan);
    
    res.json({
      success: true,
      data: {
        plan: subscription.plan,
        features: subscription.features,
        featureGates,
      },
    });
  } catch (error) {
    logger.error('Error getting features:', error);
    res.status(500).json({ success: false, message: 'Failed to get features' });
  }
});

/**
 * POST /api/subscription/upgrade
 * Upgrade user's subscription (simplified)
 */
router.post('/upgrade', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { plan } = req.body;

    if (!plan || !Object.values(PlanType).includes(plan)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan type',
      });
    }

    const result = await subscriptionService.upgradePlan(userId, plan as PlanType);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: await subscriptionService.getUserSubscription(userId),
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    logger.error('Error upgrading subscription:', error);
    res.status(500).json({ success: false, message: 'Failed to upgrade subscription' });
  }
});

/**
 * POST /api/subscription/check-action
 * Check if user can perform a specific action
 */
router.post('/check-action', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { action, currentCount } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        message: 'Action is required',
      });
    }

    const result = await subscriptionService.canPerformAction(userId, action, currentCount);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error checking action:', error);
    res.status(500).json({ success: false, message: 'Failed to check action' });
  }
});

export default router;
