"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Crown, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { apiRequest, setAuthData, User as UserType } from "../utils/auth";

interface ProfileEditFormProps {
  user: UserType;
  onUserUpdate: (updatedUser: Partial<UserType>) => void;
}

export default function ProfileEditForm({ user, onUserUpdate }: ProfileEditFormProps) {
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    gender: user.gender || 'male',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await apiRequest('/profile', {
        method: 'PUT',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      // Update user data
      setAuthData(data.user);
      
      // Update parent component
      onUserUpdate(data.user);
      
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center">
            <User className="w-5 h-5 text-slate-900" />
          </div>
          <h3 className="text-2xl font-bold text-white">Edit Profile</h3>
        </div>
        <p className="text-slate-400">Update your personal information</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
              required
              minLength={2}
              maxLength={50}
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
            <div className="w-full pl-10 pr-4 py-3 bg-slate-800/30 border border-slate-700 rounded-xl text-slate-400 flex items-center gap-2">
              <span>{user.email}</span>
              {user.isEmailVerified && (
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Verified
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Email cannot be changed</p>
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Gender
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
            <div className="w-full pl-10 pr-4 py-3 bg-slate-800/30 border border-slate-700 rounded-xl text-slate-400 capitalize">
              {user.gender || 'Not specified'}
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Gender cannot be changed after registration</p>
        </div>

        {/* Account Type Display */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Account Type
          </label>
          <div className="relative">
            <Crown className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
            <div className={`w-full pl-10 pr-4 py-3 rounded-xl flex items-center gap-2 border ${
              user.type === 'pro' 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                : 'bg-slate-800/30 border-slate-700 text-slate-400'
            }`}>
              {user.type === 'pro' ? (
                <>
                  <Crown className="w-4 h-4" />
                  <span className="font-medium">PRO Member</span>
                </>
              ) : (
                <>
                  <span>Free Account</span>
                </>
              )}
            </div>
          </div>
          {user.type === 'free' && (
            <p className="text-xs text-slate-500 mt-2">
              Upgrade to PRO for enhanced features and better matching
            </p>
          )}
        </div>

        {/* Error/Success Messages */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <p className="text-rose-400 text-sm">{error}</p>
          </motion.div>
        )}

        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2"
          >
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <p className="text-emerald-400 text-sm">{success}</p>
          </motion.div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-cyan-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Profile'
            )}
          </motion.button>
        </div>
      </form>
    </div>
  );
}
