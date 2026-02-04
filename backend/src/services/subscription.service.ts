import { User, IUser } from '../models/user.model';
import { logger } from '../config/logger';

/**
 * Premium Features System
 * Manages subscription plans, features, and premium user capabilities
 */

// Subscription plan types
export enum PlanType {
  FREE = 'free',
  PLUS = 'plus',
  PRO = 'pro',
}

// Plan features definition
export interface PlanFeatures {
  // Matching features
  genderFilter: boolean;
  regionFilter: boolean;
  interestMatching: boolean;
  priorityMatching: boolean;
  
  // Video features
  hdVideo: boolean;
  virtualBackgrounds: boolean;
  
  // Chat features
  unlimitedMessages: boolean;
  customEmojis: boolean;
  messageReactions: boolean;
  
  // Profile features
  verifiedBadge: boolean;
  profileCustomization: boolean;
  
  // Limits
  dailyMatchLimit: number;
  skipCooldownSeconds: number;
  
  // Support
  supportPriority: 'standard' | 'priority' | 'dedicated';
  
  // Ads
  noAds: boolean;
}

// Plan pricing
export interface PlanPricing {
  monthly: number;
  yearly: number;
  currency: string;
}

// Complete plan definition
export interface SubscriptionPlan {
  type: PlanType;
  name: string;
  description: string;
  features: PlanFeatures;
  pricing: PlanPricing;
  popular?: boolean;
}

// User subscription status
export interface SubscriptionStatus {
  plan: PlanType;
  isActive: boolean;
  expiresAt?: Date;
  autoRenew: boolean;
  features: PlanFeatures;
}

// Plan definitions
const PLAN_DEFINITIONS: Record<PlanType, SubscriptionPlan> = {
  [PlanType.FREE]: {
    type: PlanType.FREE,
    name: 'Free',
    description: 'Basic video chat features',
    features: {
      genderFilter: false,
      regionFilter: false,
      interestMatching: false,
      priorityMatching: false,
      hdVideo: false,
      virtualBackgrounds: false,
      unlimitedMessages: true,
      customEmojis: false,
      messageReactions: false,
      verifiedBadge: false,
      profileCustomization: false,
      dailyMatchLimit: 50,
      skipCooldownSeconds: 30,
      supportPriority: 'standard',
      noAds: false,
    },
    pricing: {
      monthly: 0,
      yearly: 0,
      currency: 'USD',
    },
  },
  [PlanType.PLUS]: {
    type: PlanType.PLUS,
    name: 'Plus',
    description: 'Enhanced matching and video quality',
    popular: true,
    features: {
      genderFilter: true,
      regionFilter: true,
      interestMatching: false,
      priorityMatching: false,
      hdVideo: true,
      virtualBackgrounds: false,
      unlimitedMessages: true,
      customEmojis: true,
      messageReactions: true,
      verifiedBadge: false,
      profileCustomization: true,
      dailyMatchLimit: 200,
      skipCooldownSeconds: 15,
      supportPriority: 'priority',
      noAds: true,
    },
    pricing: {
      monthly: 9.99,
      yearly: 79.99,
      currency: 'USD',
    },
  },
  [PlanType.PRO]: {
    type: PlanType.PRO,
    name: 'Pro',
    description: 'All features unlocked with priority support',
    features: {
      genderFilter: true,
      regionFilter: true,
      interestMatching: true,
      priorityMatching: true,
      hdVideo: true,
      virtualBackgrounds: true,
      unlimitedMessages: true,
      customEmojis: true,
      messageReactions: true,
      verifiedBadge: true,
      profileCustomization: true,
      dailyMatchLimit: -1, // Unlimited
      skipCooldownSeconds: 5,
      supportPriority: 'dedicated',
      noAds: true,
    },
    pricing: {
      monthly: 19.99,
      yearly: 159.99,
      currency: 'USD',
    },
  },
};

export class SubscriptionService {
  /**
   * Get all available plans
   */
  getAvailablePlans(): SubscriptionPlan[] {
    return Object.values(PLAN_DEFINITIONS);
  }

  /**
   * Get a specific plan
   */
  getPlan(planType: PlanType): SubscriptionPlan {
    return PLAN_DEFINITIONS[planType];
  }

  /**
   * Get features for a plan type
   */
  getFeatures(planType: PlanType): PlanFeatures {
    return PLAN_DEFINITIONS[planType].features;
  }

  /**
   * Get user's subscription status
   */
  async getUserSubscription(userId: string): Promise<SubscriptionStatus> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const planType = (user.type as PlanType) || PlanType.FREE;
      
      return {
        plan: planType,
        isActive: true, // Would check subscription expiry in production
        autoRenew: true,
        features: this.getFeatures(planType),
      };
    } catch (error) {
      logger.error('Error getting user subscription:', error);
      return {
        plan: PlanType.FREE,
        isActive: true,
        autoRenew: false,
        features: this.getFeatures(PlanType.FREE),
      };
    }
  }

  /**
   * Check if user has a specific feature
   */
  async hasFeature(userId: string, feature: keyof PlanFeatures): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    return !!subscription.features[feature];
  }

  /**
   * Check if user can perform an action based on limits
   */
  async canPerformAction(
    userId: string,
    action: 'match' | 'skip',
    currentCount?: number
  ): Promise<{ allowed: boolean; reason?: string; cooldown?: number }> {
    const subscription = await this.getUserSubscription(userId);
    const features = subscription.features;

    switch (action) {
      case 'match': {
        if (features.dailyMatchLimit === -1) {
          return { allowed: true };
        }
        if (currentCount !== undefined && currentCount >= features.dailyMatchLimit) {
          return {
            allowed: false,
            reason: 'Daily match limit reached. Upgrade to increase your limit.',
          };
        }
        return { allowed: true };
      }
      case 'skip': {
        return {
          allowed: true,
          cooldown: features.skipCooldownSeconds,
        };
      }
      default:
        return { allowed: true };
    }
  }

  /**
   * Upgrade user's plan (simplified - would integrate with payment provider in production)
   * Note: The User model currently only supports 'free' and 'pro' types.
   * Plus tier is mapped to 'pro' but can be distinguished by the plan field if needed.
   */
  async upgradePlan(userId: string, newPlan: PlanType): Promise<{ success: boolean; message: string }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Map PlanType to user type
      // Note: User model supports 'free' | 'pro', so Plus is treated as 'pro' level
      // In production, consider extending the User model to support all plan types
      const typeMapping: Record<PlanType, 'free' | 'pro'> = {
        [PlanType.FREE]: 'free',
        [PlanType.PLUS]: 'pro',
        [PlanType.PRO]: 'pro',
      };

      await User.findByIdAndUpdate(userId, { 
        type: typeMapping[newPlan]
      });

      logger.info(`User ${userId} upgraded to ${newPlan}`);
      return { success: true, message: `Successfully upgraded to ${newPlan}` };
    } catch (error) {
      logger.error('Error upgrading plan:', error);
      return { success: false, message: 'Failed to upgrade plan' };
    }
  }

  /**
   * Get premium feature gates for frontend
   */
  getFeatureGates(planType: PlanType): Record<string, { enabled: boolean; requiredPlan?: PlanType }> {
    const currentFeatures = this.getFeatures(planType);
    
    return {
      genderFilter: {
        enabled: currentFeatures.genderFilter,
        requiredPlan: currentFeatures.genderFilter ? undefined : PlanType.PLUS,
      },
      regionFilter: {
        enabled: currentFeatures.regionFilter,
        requiredPlan: currentFeatures.regionFilter ? undefined : PlanType.PLUS,
      },
      interestMatching: {
        enabled: currentFeatures.interestMatching,
        requiredPlan: currentFeatures.interestMatching ? undefined : PlanType.PRO,
      },
      priorityMatching: {
        enabled: currentFeatures.priorityMatching,
        requiredPlan: currentFeatures.priorityMatching ? undefined : PlanType.PRO,
      },
      hdVideo: {
        enabled: currentFeatures.hdVideo,
        requiredPlan: currentFeatures.hdVideo ? undefined : PlanType.PLUS,
      },
      virtualBackgrounds: {
        enabled: currentFeatures.virtualBackgrounds,
        requiredPlan: currentFeatures.virtualBackgrounds ? undefined : PlanType.PRO,
      },
      verifiedBadge: {
        enabled: currentFeatures.verifiedBadge,
        requiredPlan: currentFeatures.verifiedBadge ? undefined : PlanType.PRO,
      },
      noAds: {
        enabled: currentFeatures.noAds,
        requiredPlan: currentFeatures.noAds ? undefined : PlanType.PLUS,
      },
    };
  }

  /**
   * Calculate video quality limit based on plan
   */
  getMaxVideoQuality(planType: PlanType): '480p' | '720p' | '1080p' {
    const features = this.getFeatures(planType);
    if (features.hdVideo) {
      return '1080p';
    }
    return '480p';
  }

  /**
   * Get matching priority bonus
   */
  getMatchingPriorityBonus(planType: PlanType): number {
    switch (planType) {
      case PlanType.PRO:
        return 100;
      case PlanType.PLUS:
        return 50;
      default:
        return 0;
    }
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();

// Export types
export { PlanType as SubscriptionPlanType };
