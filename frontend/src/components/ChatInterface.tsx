"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import io from "socket.io-client";
import SimplePeer from "simple-peer";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Flag,
  Smile,
  Send,
  MessageCircle,
  AlertTriangle,
  RefreshCw,
  Volume2,
  VolumeX,
  Clock,
  Shield
} from "lucide-react";
import EmojiPicker from "./EmojiPicker";
import PreferenceSelector from "./PreferenceSelector";
import { isAuthenticated, getUser, getAuthToken } from "../utils/auth";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type ChatState = 'preferences' | 'searching' | 'connected' | 'disconnected' | 'error';
type ViewMode = 'video' | 'chat' | 'split';

interface ChatMessage {
  sender: 'You' | 'Stranger';
  text: string;
  timestamp: string;
  id: string;
}

interface PlatformStats {
  connectedUsers: number;
  waitingUsers: number;
  activeMatches: number;
  queueStats: {
    total: number;
    malePreference: number;
    femalePreference: number;
    bothPreference: number;
    proUsers: number;
  };
}

export default function ChatInterface() {
  const router = useRouter();

  const [chatState, setChatState] = useState<ChatState>('preferences');
  const [error, setError] = useState<string | null>(null);
  const [searchingMessage, setSearchingMessage] = useState("Looking for someone to chat with...");
  const [socketConnected, setSocketConnected] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [platformStats, setPlatformStats] = useState<PlatformStats>({
    connectedUsers: 0,
    waitingUsers: 0,
    activeMatches: 0,
    queueStats: {
      total: 0,
      malePreference: 0,
      femalePreference: 0,
      bothPreference: 0,
      proUsers: 0
    }
  });
  const [onlineCount, setOnlineCount] = useState(0);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string>('Stranger');
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [matchStartTime, setMatchStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [messageWarning, setMessageWarning] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [remoteAudioEnabled, setRemoteAudioEnabled] = useState(true);
  const [videoStatus, setVideoStatus] = useState<'connecting' | 'connected' | 'failed'>('connecting');
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'medium' | 'poor'>('good');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchTime, setSearchTime] = useState(0);

  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const matchTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

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
      console.log('Socket connected successfully');
      setSocketConnected(true);
      setError(null);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      setSocketConnected(false);
      setError('Connection error. Please refresh the page.');
      setChatState('error');
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('stats_update', (stats: PlatformStats) => {
      setPlatformStats(stats);
    });

    socket.on('online_count', (data: { count: number }) => {
      setOnlineCount(data.count);
    });

    socket.on('searching', (data) => {
      setChatState('searching');
      setSearchingMessage(data.message || "Looking for someone to chat with...");
      if (data.queueStats) {
        setPlatformStats(prev => ({
          ...prev,
          queueStats: data.queueStats
        }));
      }

      setSearchTime(0);
      if (searchTimerRef.current) clearInterval(searchTimerRef.current);
      searchTimerRef.current = setInterval(() => {
        setSearchTime(prev => prev + 1);
      }, 1000);
    });

    socket.on('match_found', async (data) => {
      if (searchTimerRef.current) clearInterval(searchTimerRef.current);

      setMatchId(data.matchId);
      setPartnerName(data.partner?.name || 'Stranger');
      setMatchScore(data.matchScore || null);
      setChatState('connected');
      setMessages([]);
      setError(null);
      setVideoStatus('connecting');
      setViewMode('split');
      setMatchStartTime(new Date());

      await initializeVideoCall(data.isInitiator, data.webrtcConfig);
    });

    socket.on('chat_message', (data) => {
      const newMessage: ChatMessage = {
        sender: 'Stranger',
        text: data.message,
        timestamp: data.timestamp || new Date().toISOString(),
        id: Date.now().toString()
      };
      setMessages(prev => [...prev, newMessage]);
      setPartnerTyping(false);
    });

    socket.on('typing', () => {
      setPartnerTyping(true);
      setTimeout(() => setPartnerTyping(false), 1500);
    });

    socket.on('webrtc_signal', (signal) => {
      if (peerRef.current) {
        peerRef.current.signal(signal);
      }
    });

    socket.on('call_ended', () => handleCallEnd('partner_left'));
    socket.on('match_ended', () => handleCallEnd('partner_left'));

    socket.on('match_error', (data) => {
      setError(data.message || 'Failed to find a match');
      setChatState('disconnected');
      if (searchTimerRef.current) clearInterval(searchTimerRef.current);
    });

    socket.on('message_blocked', (data) => {
      setMessageWarning(`Message blocked: ${data.reason}`);
      setTimeout(() => setMessageWarning(null), 5000);
    });

    socket.on('message_warning', (data) => {
      setMessageWarning(`Warning (${data.warningCount}): ${data.reason}`);
      setTimeout(() => setMessageWarning(null), 5000);
    });

    socket.on('connection_quality_update', (data) => {
      setConnectionQuality(data.quality);
    });

    // Notification events
    socket.on('notification', (notification) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('chatterly:notification', { detail: notification }));
      }
    });

    socket.on('notifications_list', (data) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('chatterly:notifications-list', { detail: data }));
      }
    });

    return () => {
      if (searchTimerRef.current) clearInterval(searchTimerRef.current);
      if (matchTimerRef.current) clearInterval(matchTimerRef.current);
      socket.disconnect();
      cleanupVideoCall();
    };
  }, [router]);

  useEffect(() => {
    if (chatState === 'connected' && matchStartTime) {
      matchTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - matchStartTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    } else {
      if (matchTimerRef.current) clearInterval(matchTimerRef.current);
      setElapsedTime(0);
    }

    return () => {
      if (matchTimerRef.current) clearInterval(matchTimerRef.current);
    };
  }, [chatState, matchStartTime]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  useEffect(() => {
    if (viewMode === 'video' && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender === 'Stranger') {
        setUnreadCount(prev => prev + 1);
      }
    }
  }, [messages, viewMode]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initializeVideoCall = useCallback(async (isInitiator: boolean, webrtcConfig?: any) => {
    try {
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }

      const constraints = {
        video: videoEnabled ? { width: 1280, height: 720 } : false,
        audio: audioEnabled
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const peerConfig: SimplePeer.Options = {
        initiator: isInitiator,
        trickle: true,
        stream: stream,
        config: {
          iceServers: webrtcConfig?.iceServers || [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
          iceCandidatePoolSize: 10,
        }
      };

      const peer = new SimplePeer(peerConfig);

      peer.on('signal', (data: SimplePeer.SignalData) => {
        socketRef.current?.emit('webrtc_signal', data);
      });

      peer.on('stream', (remoteStream: MediaStream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          setVideoStatus('connected');
        }
      });

      peer.on('connect', () => {
        setVideoStatus('connected');
      });

      peer.on('error', () => {
        setVideoStatus('failed');
        setError('Video connection failed. Please try again.');
      });

      peer.on('close', () => {
        setVideoStatus('failed');
      });

      peerRef.current = peer;
    } catch {
      setVideoStatus('failed');
      setError('Failed to access camera/microphone. Please check permissions.');
    }
  }, [videoEnabled, audioEnabled]);

  const cleanupVideoCall = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setConnectionQuality('good');
    setVideoStatus('connecting');
  }, []);

  const handleStartSearch = (preferences: { gender: 'male' | 'female' | 'both' }) => {
    if (!socketConnected) {
      setError('Not connected to server. Please refresh the page.');
      return;
    }
    setChatState('searching');
    setError(null);
    socketRef.current?.emit('find_match', { preferredGender: preferences.gender });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !matchId) return;

    const newMessage: ChatMessage = {
      sender: 'You',
      text: input.trim(),
      timestamp: new Date().toISOString(),
      id: Date.now().toString()
    };

    setMessages(prev => [...prev, newMessage]);
    socketRef.current?.emit('chat_message', { message: input.trim() });
    setInput('');
    setIsTyping(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);

    if (!isTyping && e.target.value.length > 0) {
      setIsTyping(true);
      socketRef.current?.emit('typing');

      setTimeout(() => {
        setIsTyping(false);
      }, 1000);
    }
  };

  const handleCallEnd = useCallback((reason?: string) => {
    cleanupVideoCall();
    setChatState('disconnected');
    setMatchId(null);
    setPartnerName('Stranger');
    setMessages([]);
    setMatchStartTime(null);

    if (reason === 'partner_left') {
      setError('Your partner has left the chat');
    }
  }, [cleanupVideoCall]);

  const handleEndCall = () => {
    socketRef.current?.emit('end_call');
    handleCallEnd();
  };

  const handleNewChat = () => {
    setChatState('preferences');
    setError(null);
    setViewMode('split');
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoEnabled;
        setVideoEnabled(!videoEnabled);
      }
    }
  };

  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioEnabled;
        setAudioEnabled(!audioEnabled);
      }
    }
  };

  const toggleRemoteAudio = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !remoteAudioEnabled;
      setRemoteAudioEnabled(!remoteAudioEnabled);
    }
  };

  const handleReportUser = () => {
    if (matchId) {
      socketRef.current?.emit('report_user', { reason: 'inappropriate_behavior' });
    }
  };

  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (chatState === 'preferences') {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] p-4">
        <div className="w-full max-w-4xl">
          <PreferenceSelector onStart={handleStartSearch} />
        </div>
      </div>
    );
  }

  if (chatState === 'searching') {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] p-4">
        <div className="w-full max-w-lg mx-auto text-center">
          <div className="mb-8">
            <div className="relative inline-block">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-24 h-24 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                  <MessageCircle className="w-8 h-8 text-slate-900" />
                </div>
              </div>
            </div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold text-white mt-6 mb-2"
            >
              Finding your match...
            </motion.h2>
            <p className="text-slate-400">{searchingMessage}</p>
          </div>

          <div className="flex items-center justify-center gap-2 text-slate-400 mb-6">
            <Clock className="w-4 h-4" />
            <span>Searching for {formatElapsedTime(searchTime)}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <span className="text-slate-400 text-sm">Online</span>
              <p className="text-xl font-bold text-white">{onlineCount.toLocaleString()}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <span className="text-slate-400 text-sm">Waiting</span>
              <p className="text-xl font-bold text-white">{platformStats.waitingUsers.toLocaleString()}</p>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl"
            >
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-4 h-4" />
                <p className="text-sm">{error}</p>
              </div>
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setChatState('preferences')}
            className="text-slate-400 hover:text-cyan-400 transition-colors"
          >
            Cancel and change preferences
          </motion.button>
        </div>
      </div>
    );
  }

  if (chatState === 'disconnected' || chatState === 'error') {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] p-4">
        <div className="w-full max-w-md mx-auto glass rounded-3xl shadow-2xl p-8 text-center">
          <div className="mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-24 h-24 bg-gradient-to-br from-slate-800 to-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-slate-700"
            >
              {chatState === 'error' ? (
                <AlertTriangle className="w-12 h-12 text-rose-400" />
              ) : (
                <MessageCircle className="w-12 h-12 text-cyan-400" />
              )}
            </motion.div>
            <h2 className="text-3xl font-bold text-white mb-2">
              {chatState === 'error' ? 'Connection Error' : 'Chat Ended'}
            </h2>
            <p className="text-slate-400">
              {chatState === 'error' ? 'Please try again' : 'The conversation has ended'}
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl"
            >
              <div className="flex items-center gap-2 text-yellow-400">
                <AlertTriangle className="w-4 h-4" />
                <p className="text-sm">{error}</p>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-slate-800/50 rounded-xl p-3">
              <p className="text-2xl font-bold text-white">{messages.length}</p>
              <p className="text-xs text-slate-400">Messages</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3">
              <p className="text-2xl font-bold text-white">{formatElapsedTime(elapsedTime)}</p>
              <p className="text-xs text-slate-400">Duration</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3">
              <p className="text-2xl font-bold text-cyan-400">{matchScore ? Math.round(matchScore * 100) : 0}%</p>
              <p className="text-xs text-slate-400">Match Score</p>
            </div>
          </div>

          <div className="space-y-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNewChat}
              className="w-full py-4 px-6 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Start New Chat
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {messageWarning && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-500/90 backdrop-blur-sm text-white px-4 py-2 flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4" />
          {messageWarning}
        </motion.div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {(viewMode === 'video' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'flex-1' : 'w-full'} relative bg-black`}>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {videoStatus === 'connecting' && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80">
                <div className="text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full mx-auto mb-4"
                  />
                  <p className="text-white text-lg">Connecting video...</p>
                </div>
              </div>
            )}

            {videoStatus === 'failed' && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                <div className="text-center">
                  <VideoOff className="w-20 h-20 text-slate-400 mx-auto mb-4" />
                  <p className="text-white text-lg mb-2">Video unavailable</p>
                  <p className="text-slate-400 text-sm">Connection failed or partner has no camera</p>
                </div>
              </div>
            )}

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-4 right-4 w-32 h-24 sm:w-48 sm:h-36 bg-slate-800 rounded-xl overflow-hidden border-2 border-slate-700"
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!videoEnabled && (
                <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
                  <VideoOff className="w-6 h-6 text-slate-400" />
                </div>
              )}
            </motion.div>

            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleVideo}
                className={`p-3 rounded-full transition-all ${
                  videoEnabled ? 'bg-slate-700/80 text-white hover:bg-slate-600' : 'bg-rose-500 text-white hover:bg-rose-600'
                }`}
              >
                {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleAudio}
                className={`p-3 rounded-full transition-all ${
                  audioEnabled ? 'bg-slate-700/80 text-white hover:bg-slate-600' : 'bg-rose-500 text-white hover:bg-rose-600'
                }`}
              >
                {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleRemoteAudio}
                className={`p-3 rounded-full transition-all ${
                  remoteAudioEnabled ? 'bg-slate-700/80 text-white hover:bg-slate-600' : 'bg-yellow-500 text-white hover:bg-yellow-600'
                }`}
              >
                {remoteAudioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleEndCall}
                className="p-3 rounded-full bg-rose-500 text-white hover:bg-rose-600 transition-all"
              >
                <PhoneOff className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        )}

        {(viewMode === 'chat' || viewMode === 'split') && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className={`${viewMode === 'split' ? 'w-full md:w-[400px]' : 'w-full'} bg-slate-900/50 border-l border-slate-800 flex flex-col`}
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold">
                  {partnerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{partnerName}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {formatElapsedTime(elapsedTime)}
                  </p>
                </div>
              </div>
              {matchScore !== null && (
                <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">
                  {Math.round(matchScore * 100)}% Match
                </span>
              )}
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-slate-500 py-8">
                  <Shield className="w-12 h-12 text-cyan-400/30 mx-auto mb-3" />
                  <p>Say hello to start the conversation!</p>
                </div>
              )}

              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.sender === 'You' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-2 rounded-2xl ${
                      message.sender === 'You'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                        : 'bg-slate-800 text-slate-200'
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                  </div>
                </motion.div>
              ))}

              {partnerTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-slate-800 px-4 py-2 rounded-2xl">
                    <div className="flex space-x-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          animate={{ y: [0, -4, 0] }}
                          transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                          className="w-2 h-2 bg-slate-400 rounded-full"
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-slate-800">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Type a message..."
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-cyan-400"
                  >
                    <Smile className="w-5 h-5" />
                  </button>

                  {showEmojiPicker && (
                    <div className="absolute bottom-full right-0 mb-2 z-50">
                      <EmojiPicker
                        onSelect={(emoji) => {
                          setInput(prev => prev + emoji);
                          setShowEmojiPicker(false);
                        }}
                      />
                    </div>
                  )}
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={!input.trim()}
                  className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </motion.button>
              </form>
            </div>
          </motion.div>
        )}
      </div>

      <div className="h-14 bg-slate-900/50 border-t border-slate-800 flex items-center justify-center gap-4">
        <button
          onClick={() => setViewMode('video')}
          className={`px-4 py-2 rounded-lg transition-all ${viewMode === 'video' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          Video
        </button>
        <button
          onClick={() => setViewMode('split')}
          className={`px-4 py-2 rounded-lg transition-all ${viewMode === 'split' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          Split
        </button>
        <button
          onClick={() => setViewMode('chat')}
          className={`px-4 py-2 rounded-lg transition-all ${viewMode === 'chat' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          Chat
        </button>
        <button
          onClick={handleReportUser}
          className="px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
        >
          Report
        </button>
      </div>
    </div>
  );
}
