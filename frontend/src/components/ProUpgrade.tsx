"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Crown, Star, Check, X, Sparkles, Zap, Target, Flame, Gift, Trophy, Loader2 } from "lucide-react";
import { apiRequest, setAuthData, User } from "../utils/auth";

interface ProUpgradeProps {
  user: User;
  onUserUpdate: (updatedUser: Partial<User>) => void;
}

export default function ProUpgrade({ user, onUserUpdate }: ProUpgradeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleUpgrade = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await apiRequest('/profile/upgrade', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upgrade account');
      }

      // Update user data
      setAuthData(data.user);
      
      // Update parent component
      onUserUpdate({ type: 'pro' });
      
      setSuccess('Successfully upgraded to PRO! Enjoy your enhanced features.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upgrade account');
    } finally {
      setLoading(false);
    }
  };

  if (user.type === 'pro') {
    return (
      <div className="p-6 sm:p-8">
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/25"
          >
            <Crown className="w-12 h-12 text-white" />
          </motion.div>
          <h3 className="text-3xl font-bold text-white mb-2">You're Already PRO!</h3>
          <p className="text-slate-400">Thank you for supporting our platform</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-6">
          <h4 className="font-semibold text-amber-400 mb-6 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Your PRO Benefits
          </h4>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: Target, text: 'Full gender preference selection' },
              { icon: Sparkles, text: '80% opposite gender matches' },
              { icon: Zap, text: 'Priority matching queue' },
              { icon: Star, text: 'Enhanced profile features' },
              { icon: Gift, text: 'Exclusive PRO-only events' },
              { icon: Trophy, text: 'Premium support' },
            ].map((benefit, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-slate-300 text-sm">{benefit.text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="text-center mb-8">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/25"
        >
          <Crown className="w-12 h-12 text-white" />
        </motion.div>
        <h3 className="text-3xl font-bold text-white mb-2">Upgrade to PRO</h3>
        <p className="text-slate-400">Unlock enhanced features and better matching</p>
      </div>

      {/* Pricing Card */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl text-white p-6 sm:p-8 mb-8 shadow-lg shadow-amber-500/25">
        <div className="text-center">
          <h4 className="text-2xl font-bold mb-2">PRO Membership</h4>
          <div className="flex items-baseline justify-center gap-1 mb-1">
            <span className="text-5xl font-bold">$9.99</span>
            <span className="text-amber-100">/month</span>
          </div>
          <p className="text-amber-100 mb-6">Cancel anytime</p>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h5 className="font-semibold mb-4 flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5" />
              What you get:
            </h5>
            <div className="space-y-3 text-left">
              {[
                { icon: Target, text: 'Full gender preference selection' },
                { icon: Sparkles, text: '80% opposite gender matches' },
                { icon: Zap, text: 'Priority in matching queue' },
                { icon: Flame, text: 'Enhanced profile features' },
                { icon: Gift, text: 'Exclusive PRO-only events' },
                { icon: Trophy, text: 'Premium support' },
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-3 h-3" />
                  </div>
                  <span className="text-sm">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Comparison */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Free Account */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
              <Star className="w-5 h-5 text-slate-400" />
            </div>
            <h4 className="font-semibold text-white">Free Account</h4>
          </div>
          <div className="space-y-3">
            {[
              'Limited gender preferences',
              '80% same gender matches',
              'Standard queue priority',
              'Basic chat features',
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3 text-slate-400">
                <X className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* PRO Account */}
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <h4 className="font-semibold text-amber-400">PRO Account</h4>
          </div>
          <div className="space-y-3">
            {[
              'Full gender preferences',
              '80% opposite gender matches',
              'Priority matching',
              'All chat features + more',
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3 text-slate-300">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl mb-6 flex items-center gap-2"
        >
          <X className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <p className="text-rose-400 text-sm">{error}</p>
        </motion.div>
      )}

      {success && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl mb-6 flex items-center gap-2"
        >
          <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <p className="text-emerald-400 text-sm">{success}</p>
        </motion.div>
      )}

      {/* Upgrade Button */}
      <div className="text-center">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg rounded-xl hover:shadow-xl hover:shadow-amber-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Crown className="w-5 h-5" />
              Upgrade to PRO Now - $9.99/month
            </>
          )}
        </motion.button>
        
        <p className="text-xs text-slate-500 mt-4">
          * For demo purposes, this will upgrade your account immediately without payment processing
        </p>
      </div>
    </div>
  );
}
