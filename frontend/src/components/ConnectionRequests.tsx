"use client";

import { motion } from "framer-motion";
import {
  X,
  Check,
  User,
  Clock,
  MessageCircle,
  ArrowRight,
  Inbox,
  Send
} from "lucide-react";

interface ConnectionRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
  message?: string;
  createdAt: number;
  otherUser?: {
    id: string;
    name: string;
    avatar?: string;
    gender?: string;
  };
}

interface ConnectionRequestsProps {
  pendingRequests: ConnectionRequest[];
  sentRequests: ConnectionRequest[];
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
  onCancel: (requestId: string) => void;
  onClose: () => void;
}

export default function ConnectionRequests({
  pendingRequests,
  sentRequests,
  onAccept,
  onReject,
  onCancel,
  onClose
}: ConnectionRequestsProps) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Inbox className="w-5 h-5 text-cyan-400" />
            Connection Requests
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Received Requests */}
          <div className="p-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Inbox className="w-4 h-4" />
              Received
              {pendingRequests.length > 0 && (
                <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">
                  {pendingRequests.length}
                </span>
              )}
            </h3>

            {pendingRequests.length === 0 ? (
              <div className="text-center py-6 bg-slate-800/30 rounded-xl">
                <Inbox className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No pending requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-slate-800/50 border border-slate-700 rounded-xl p-4"
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      {request.otherUser?.avatar ? (
                        <img
                          src={request.otherUser.avatar}
                          alt={request.otherUser.name}
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                      ) : (
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getGenderColor(request.otherUser?.gender)} flex items-center justify-center`}>
                          <span className="text-lg font-bold text-white">
                            {getInitials(request.otherUser?.name || '?')}
                          </span>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-white truncate">
                            {request.otherUser?.name || 'Unknown User'}
                          </h4>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(request.createdAt)}
                          </span>
                        </div>

                        {request.message && (
                          <p className="text-sm text-slate-400 mt-1 italic">
                            "{request.message}"
                          </p>
                        )}

                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => onReject(request.id)}
                            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                          >
                            <X className="w-4 h-4" />
                            Decline
                          </button>
                          <button
                            onClick={() => onAccept(request.id)}
                            className="flex-1 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                          >
                            <Check className="w-4 h-4" />
                            Accept
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-800" />

          {/* Sent Requests */}
          <div className="p-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Send className="w-4 h-4" />
              Sent
              {sentRequests.length > 0 && (
                <span className="px-2 py-0.5 bg-slate-700 text-slate-400 text-xs rounded-full">
                  {sentRequests.length}
                </span>
              )}
            </h3>

            {sentRequests.length === 0 ? (
              <div className="text-center py-6 bg-slate-800/30 rounded-xl">
                <Send className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No pending requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sentRequests.map((request) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4"
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      {request.otherUser?.avatar ? (
                        <img
                          src={request.otherUser.avatar}
                          alt={request.otherUser.name}
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                      ) : (
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getGenderColor(request.otherUser?.gender)} flex items-center justify-center`}>
                          <span className="text-lg font-bold text-white">
                            {getInitials(request.otherUser?.name || '?')}
                          </span>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-white truncate">
                            {request.otherUser?.name || 'Unknown User'}
                          </h4>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(request.createdAt)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-amber-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Waiting for response...
                          </span>
                          <button
                            onClick={() => onCancel(request.id)}
                            className="text-sm text-slate-400 hover:text-rose-400 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
