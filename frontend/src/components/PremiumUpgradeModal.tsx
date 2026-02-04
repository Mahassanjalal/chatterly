"use client";

import React from 'react';

interface PlanFeatures {
  genderFilter: boolean;
  regionFilter: boolean;
  interestMatching: boolean;
  priorityMatching: boolean;
  hdVideo: boolean;
  virtualBackgrounds: boolean;
  unlimitedMessages: boolean;
  customEmojis: boolean;
  messageReactions: boolean;
  verifiedBadge: boolean;
  profileCustomization: boolean;
  dailyMatchLimit: number;
  skipCooldownSeconds: number;
  supportPriority: 'standard' | 'priority' | 'dedicated';
  noAds: boolean;
}

interface SubscriptionPlan {
  type: 'free' | 'plus' | 'pro';
  name: string;
  description: string;
  features: PlanFeatures;
  pricing: {
    monthly: number;
    yearly: number;
    currency: string;
  };
  popular?: boolean;
}

interface PremiumUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: 'free' | 'plus' | 'pro';
  plans: SubscriptionPlan[];
  onUpgrade: (planType: string) => void;
}

const featureLabels: Record<keyof PlanFeatures, string> = {
  genderFilter: 'Gender Filter',
  regionFilter: 'Region Filter',
  interestMatching: 'Interest-Based Matching',
  priorityMatching: 'Priority Matching',
  hdVideo: 'HD Video Quality',
  virtualBackgrounds: 'Virtual Backgrounds',
  unlimitedMessages: 'Unlimited Messages',
  customEmojis: 'Custom Emojis',
  messageReactions: 'Message Reactions',
  verifiedBadge: 'Verified Badge',
  profileCustomization: 'Profile Customization',
  dailyMatchLimit: 'Daily Match Limit',
  skipCooldownSeconds: 'Skip Cooldown',
  supportPriority: 'Support Priority',
  noAds: 'Ad-Free Experience',
};

export default function PremiumUpgradeModal({
  isOpen,
  onClose,
  currentPlan,
  plans,
  onUpgrade,
}: PremiumUpgradeModalProps) {
  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'yearly'>('monthly');

  if (!isOpen) return null;

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(price);
  };

  const getFeatureValue = (value: boolean | number | string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      );
    }
    if (typeof value === 'number') {
      return value === -1 ? 'Unlimited' : value.toString();
    }
    return value;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Upgrade Your Plan</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Billing Cycle Toggle */}
          <div className="mt-4 flex items-center justify-center gap-4">
            <span className={`text-sm ${billingCycle === 'monthly' ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm ${billingCycle === 'yearly' ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
              Yearly
              <span className="ml-1 text-green-600 text-xs font-medium">Save 33%</span>
            </span>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = plan.type === currentPlan;
            const price = billingCycle === 'monthly' ? plan.pricing.monthly : plan.pricing.yearly / 12;
            
            return (
              <div
                key={plan.type}
                className={`relative rounded-xl border-2 p-6 ${
                  plan.popular
                    ? 'border-blue-500 shadow-lg'
                    : isCurrentPlan
                    ? 'border-green-500'
                    : 'border-gray-200'
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-500 text-white text-xs font-semibold rounded-full">
                    Most Popular
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
                    Current Plan
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">
                      {formatPrice(price, plan.pricing.currency)}
                    </span>
                    <span className="text-gray-500">/month</span>
                  </div>
                  {billingCycle === 'yearly' && plan.pricing.yearly > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      Billed {formatPrice(plan.pricing.yearly, plan.pricing.currency)}/year
                    </p>
                  )}
                </div>

                {/* Features List */}
                <ul className="space-y-3 mb-6">
                  {Object.entries(plan.features).slice(0, 8).map(([key, value]) => (
                    <li key={key} className="flex items-center gap-2 text-sm text-gray-600">
                      {getFeatureValue(value)}
                      <span>{featureLabels[key as keyof PlanFeatures]}</span>
                    </li>
                  ))}
                </ul>

                {/* Action Button */}
                <button
                  onClick={() => onUpgrade(plan.type)}
                  disabled={isCurrentPlan}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                    isCurrentPlan
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : plan.popular
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                  }`}
                >
                  {isCurrentPlan ? 'Current Plan' : `Upgrade to ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <p className="text-center text-sm text-gray-500">
            All plans include a 7-day free trial. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
