"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Crown,
  Globe,
  Heart,
  MessageCircle,
  Clock,
  Check,
  X,
  Loader2
} from "lucide-react";

interface UserCardProps {
  user: {
    id: string;
    name: string;
    gender?: 'male' | 'female' | 'other';
    avatar?: string;
    interests: string[];
    languages: string[];
    type: 'free' | 'pro';
    isOnline: boolean;
    lastSeen?: number;
  };
  index: number;
  sentRequests: Array<{
    id: string;
    toUserId: string;
    status: string;
  }>;
  onSendRequest: (userId: string, message?: string) => void;
  onCancelRequest: (requestId: string) => void;
}

export default function UserCard({
  user,
  index,
  sentRequests,
  onSendRequest,
  onCancelRequest
}: UserCardProps) {
  const [showMessageInput, setShowMessageInput] = useState(false);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Check if there's a pending request to this user
  const pendingRequest = sentRequests.find(
    r => r.toUserId === user.id && r.status === 'pending'
  );

  const handleSendRequest = async () => {
    setIsSending(true);
    onSendRequest(user.id, message || undefined);
    setShowMessageInput(false);
    setMessage("");
    setTimeout(() => setIsSending(false), 500);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getGenderColor = (gender?: string) => {
    switch (gender) {
      case 'male':
        return 'from-blue-400 to-indigo-500';
      case 'female':
        return 'from-pink-400 to-rose-500';
      default:
        return 'from-purple-400 to-pink-500';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-colors group"
    >
      {/* Header / Avatar */}
      <div className="relative">
        <div className={`h-24 bg-gradient-to-r ${getGenderColor(user.gender)} opacity-20`} />
        <div className="absolute -bottom-10 left-4">
          <div className="relative">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-20 h-20 rounded-2xl border-4 border-slate-800 object-cover"
              />
            ) : (
              <div className={`w-20 h-20 rounded-2xl border-4 border-slate-800 bg-gradient-to-br ${getGenderColor(user.gender)} flex items-center justify-center`}>
                <span className="text-2xl font-bold text-white">
                  {getInitials(user.name)}
                </span>
              </div>
            )}
            {user.isOnline && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-slate-800 rounded-full" />
            )}
          </div>
        </div>
        
        {/* Pro Badge */}
        {user.type === 'pro' && (
          <div className="absolute top-3 right-3 px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded-lg flex items-center gap-1">
            <Crown className="w-3 h-3 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400">PRO</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="pt-12 px-4 pb-4">
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            {user.name}
            {user.gender && (
              <span className={`w-2 h-2 rounded-full ${
                user.gender === 'male' ? 'bg-blue-400' :
                user.gender === 'female' ? 'bg-pink-400' : 'bg-purple-400'
              }`} />
            )}
          </h3>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <Globe className="w-3 h-3" />
            {user.languages.slice(0, 2).join(', ') || 'No languages'}
          </p>
        </div>

        {/* Interests */}
        {user.interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {user.interests.slice(0, 3).map((interest, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-slate-700/50 text-slate-300 text-xs rounded-full"
              >
                {interest}
              </span>
            ))}
            {user.interests.length > 3 && (
              <span className="px-2 py-0.5 bg-slate-700/50 text-slate-400 text-xs rounded-full">
                +{user.interests.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Action Button */}
        {pendingRequest ? (
          <button
            onClick={() => onCancelRequest(pendingRequest.id)}
            className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <X className="w-4 h-4" />
            <span className="text-sm font-medium">Cancel Request</span>
          </button>
        ) : showMessageInput ? (
          <div className="space-y-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message (optional)..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              maxLength={100}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowMessageInput(false)}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendRequest}
                disabled={isSending}
                className="flex-1 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Send
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowMessageInput(true)}
            className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl flex items-center justify-center gap-2 transition-all group-hover:shadow-lg group-hover:shadow-cyan-500/25"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Connect</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}
