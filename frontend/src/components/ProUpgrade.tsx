"use client";

import { useState } from "react";
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
      <div className="p-8 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-4">
            ⭐
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">You&apos;re already PRO!</h3>
          <p className="text-gray-600">Thank you for supporting our platform</p>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6">
          <h4 className="font-semibold text-purple-800 mb-4">Your PRO Benefits</h4>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-green-500">✅</span>
              <span>Full gender preference selection</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-green-500">✅</span>
              <span>80% opposite gender matches</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-green-500">✅</span>
              <span>Priority matching queue</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-green-500">✅</span>
              <span>Enhanced profile features</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-4">
          ⭐
        </div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">Upgrade to PRO</h3>
        <p className="text-gray-600">Unlock enhanced features and better matching</p>
      </div>

      {/* Pricing Card */}
      <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl text-white p-8 mb-8">
        <div className="text-center">
          <h4 className="text-2xl font-bold mb-2">PRO Membership</h4>
          <div className="text-4xl font-bold mb-1">$9.99</div>
          <div className="text-purple-100 mb-6">per month</div>
          
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 mb-6">
            <h5 className="font-semibold mb-4">What you get:</h5>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="text-yellow-300">🎯</span>
                <span>Full gender preference selection</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-yellow-300">💫</span>
                <span>80% opposite gender matches</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-yellow-300">⚡</span>
                <span>Priority in matching queue</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-yellow-300">🔥</span>
                <span>Enhanced profile features</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-yellow-300">🎪</span>
                <span>Exclusive PRO-only events</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-yellow-300">🏆</span>
                <span>Premium support</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Free Account */}
        <div className="bg-gray-50 rounded-xl p-6">
          <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span>🆓</span>
            Free Account
          </h4>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-gray-400">❌</span>
              <span className="text-gray-600">Limited gender preferences</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-400">❌</span>
              <span className="text-gray-600">80% same gender matches</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-400">❌</span>
              <span className="text-gray-600">Standard queue priority</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-green-500">✅</span>
              <span className="text-gray-600">Basic chat features</span>
            </div>
          </div>
        </div>

        {/* PRO Account */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
          <h4 className="font-semibold text-purple-800 mb-4 flex items-center gap-2">
            <span>⭐</span>
            PRO Account
          </h4>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-green-500">✅</span>
              <span className="text-purple-700">Full gender preferences</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-green-500">✅</span>
              <span className="text-purple-700">80% opposite gender matches</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-green-500">✅</span>
              <span className="text-purple-700">Priority matching</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-green-500">✅</span>
              <span className="text-purple-700">All chat features + more</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
          <p className="text-green-600 text-sm">{success}</p>
        </div>
      )}

      {/* Upgrade Button */}
      <div className="text-center">
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-lg rounded-xl hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Upgrade to PRO Now - $9.99/month'}
        </button>
        
        <p className="text-xs text-gray-500 mt-4">
          * For demo purposes, this will upgrade your account immediately without payment processing
        </p>
      </div>
    </div>
  );
}
