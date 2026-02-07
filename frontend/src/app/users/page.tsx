"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import io from "socket.io-client";
import {
  Users,
  Search,
  Filter,
  Crown,
  User,
  Globe,
  Heart,
  MessageCircle,
  Bell,
  RefreshCw,
  Zap,
  Shield,
  Clock,
  X
} from "lucide-react";
import { getAuthToken, getUser, isAuthenticated } from "@/utils/auth";
import UserCard from "@/components/UserCard";
import ConnectionRequests from "@/components/ConnectionRequests";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface OnlineUser {
  id: string;
  name: string;
  gender?: 'male' | 'female' | 'other';
  avatar?: string;
  interests: string[];
  languages: string[];
  type: 'free' | 'pro';
  isOnline: boolean;
  lastSeen?: number;
}

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

export default function OnlineUsersPage() {
  const router = useRouter();
  
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<OnlineUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGender, setSelectedGender] = useState<'all' | 'male' | 'female'>('all');
  const [showProOnly, setShowProOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [showRequests, setShowRequests] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<ConnectionRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<ConnectionRequest[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentUser, setCurrentUser] = useState<any>(null);

  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    setCurrentUser(getUser());
  }, [router]);

  // Initialize socket connection
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
      auth: {
        token: getAuthToken() || ''
      }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected for direct connections');
      setSocketConnected(true);
      setError(null);
      
      // Register as online for direct connections
      const user = getUser();
      if (user) {
        socket.emit('register_online', {
          name: user.name,
          gender: user.gender,
          avatar: user.avatar,
          interests: user.interests || [],
          languages: user.languages || [],
          type: user.type || 'free'
        });
      }
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      setSocketConnected(false);
      setError('Connection error. Please refresh the page.');
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    // Direct connection events
    socket.on('registered_online', () => {
      console.log('Successfully registered as online');
      fetchOnlineUsers();
      fetchConnectionRequests();
    });

    socket.on('direct_connection_error', (data) => {
      setError(data.message);
    });

    socket.on('connection_request_received', (data) => {
      // Add new request to pending
      setPendingRequests(prev => [data, ...prev]);
      // Show notification
      if (Notification.permission === 'granted') {
        new Notification('New Connection Request', {
          body: `${data.fromUser?.name || 'Someone'} wants to connect with you`,
          icon: '/logo.png'
        });
      }
    });

    socket.on('connection_request_sent', (data) => {
      fetchConnectionRequests();
    });

    socket.on('connection_request_accepted', (data) => {
      // Redirect to chat with the connection
      router.push(`/chat?connectionId=${data.connectionId}&direct=true`);
    });

    socket.on('connection_request_rejected', (data) => {
      fetchConnectionRequests();
      setError('Your connection request was rejected');
      setTimeout(() => setError(null), 3000);
    });

    socket.on('connection_request_cancelled', (data) => {
      fetchConnectionRequests();
    });

    socket.on('direct_online_count', (data) => {
      setOnlineCount(data.count);
    });

    // Heartbeat to keep user online
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('heartbeat_online');
      }
    }, 30000); // Every 30 seconds

    return () => {
      clearInterval(heartbeatInterval);
      socket.disconnect();
    };
  }, [router]);

  // Fetch online users
  const fetchOnlineUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/direct-connections/online-users`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch online users');
      }

      const data = await response.json();
      setOnlineUsers(data.users);
      setOnlineCount(data.totalCount);
      setError(null);
    } catch (err) {
      console.error('Error fetching online users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch online users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch connection requests
  const fetchConnectionRequests = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/direct-connections/requests`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch connection requests');
      }

      const data = await response.json();
      setPendingRequests(data.received.filter((r: ConnectionRequest) => r.status === 'pending'));
      setSentRequests(data.sent.filter((r: ConnectionRequest) => r.status === 'pending'));
    } catch (err) {
      console.error('Error fetching connection requests:', err);
    }
  }, []);

  // Filter users
  useEffect(() => {
    let filtered = onlineUsers;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(query) ||
        user.interests.some(i => i.toLowerCase().includes(query)) ||
        user.languages.some(l => l.toLowerCase().includes(query))
      );
    }

    // Filter by gender
    if (selectedGender !== 'all') {
      filtered = filtered.filter(user => user.gender === selectedGender);
    }

    // Filter by pro status
    if (showProOnly) {
      filtered = filtered.filter(user => user.type === 'pro');
    }

    setFilteredUsers(filtered);
  }, [onlineUsers, searchQuery, selectedGender, showProOnly]);

  // Send connection request
  const sendConnectionRequest = (userId: string, message?: string) => {
    if (!socketRef.current?.connected) {
      setError('Not connected to server');
      return;
    }

    socketRef.current.emit('send_connection_request', {
      toUserId: userId,
      message
    });
  };

  // Accept connection request
  const acceptRequest = (requestId: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('accept_connection_request', { requestId });
  };

  // Reject connection request
  const rejectRequest = (requestId: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('reject_connection_request', { requestId });
    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
  };

  // Cancel sent request
  const cancelRequest = (requestId: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('cancel_connection_request', { requestId });
    setSentRequests(prev => prev.filter(r => r.id !== requestId));
  };

  // Initial fetch
  useEffect(() => {
    fetchOnlineUsers();
    fetchConnectionRequests();
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [fetchOnlineUsers, fetchConnectionRequests]);

  // Refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOnlineUsers();
      fetchConnectionRequests();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchOnlineUsers, fetchConnectionRequests]);

  const totalPending = pendingRequests.length + sentRequests.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
      {/* Header */}
      <div className="bg-slate-900/50 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl">
                  <Users className="w-6 h-6 text-white" />
                </div>
                Browse Users
              </h1>
              <p className="text-slate-400 mt-1 flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                {onlineCount} users online now
                {socketConnected && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    Live
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowRequests(true)}
                className="relative px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl flex items-center gap-2 transition-colors"
              >
                <Bell className="w-5 h-5" />
                <span className="hidden sm:inline">Requests</span>
                {totalPending > 0 && (
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {totalPending}
                  </span>
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={fetchOnlineUsers}
                disabled={isLoading}
                className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900/30 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, interests, or languages..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            {/* Gender Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-400" />
              <select
                value={selectedGender}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onChange={(e) => setSelectedGender(e.target.value as any)}
                className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
              >
                <option value="all">All Genders</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            {/* Pro Filter */}
            <button
              onClick={() => setShowProOnly(!showProOnly)}
              className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors ${
                showProOnly
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Crown className="w-4 h-4" />
              <span>Pro Only</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4"
        >
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between">
            <p className="text-rose-400">{error}</p>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-300">
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading && onlineUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full"
            />
            <p className="text-slate-400 mt-4">Loading online users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-20 h-20 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No users found</h3>
            <p className="text-slate-400">
              {onlineUsers.length === 0
                ? "No users are currently online. Check back later!"
                : "No users match your filters. Try adjusting your search criteria."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {filteredUsers.map((user, index) => (
                <UserCard
                  key={user.id}
                  user={user}
                  index={index}
                  sentRequests={sentRequests}
                  onSendRequest={sendConnectionRequest}
                  onCancelRequest={cancelRequest}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Connection Requests Modal */}
      <AnimatePresence>
        {showRequests && (
          <ConnectionRequests
            pendingRequests={pendingRequests}
            sentRequests={sentRequests}
            onAccept={acceptRequest}
            onReject={rejectRequest}
            onCancel={cancelRequest}
            onClose={() => setShowRequests(false)}
          />
        )}
      </AnimatePresence>

      {/* Feature Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-cyan-500/10 rounded-xl">
              <Shield className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">How Direct Connections Work</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-400">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 font-semibold">1</div>
                  <p>Browse online users and send connection requests to those you want to chat with</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 font-semibold">2</div>
                  <p>Wait for them to accept your request. You will be notified when they respond</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 font-semibold">3</div>
                  <p>Once accepted, you can start a direct video chat immediately</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
