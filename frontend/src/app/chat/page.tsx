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
  Users,
  Signal,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  Sparkles,
  MoreVertical,
  Shield
} from "lucide-react";
import EmojiPicker from "../../components/EmojiPicker";
import PreferenceSelector from "../../components/PreferenceSelector";
import ConnectionQualityIndicator from "../../components/ConnectionQualityIndicator";
import { isAuthenticated } from "../../utils/auth";
import { AdaptiveQualityController, ConnectionQuality, QualityLevel } from "../../utils/adaptive-quality";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type ChatState = 'preferences' | 'searching' | 'connected' | 'disconnected';

interface WebRTCConfig {
  iceServers: Array<{
    urls: string | string[];
    username?: string;
    credential?: string;
  }>;
  iceCandidatePoolSize: number;
}

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
};

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.4 }
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.4 }
};

export default function ChatPage() {
  const router = useRouter();
  
  // Core state
  const [chatState, setChatState] = useState<ChatState>('preferences');
  const [error, setError] = useState<string | null>(null);
  const [searchingMessage, setSearchingMessage] = useState("Looking for someone to chat with...");
  
  // Match state
  const [matchId, setMatchId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string>('Stranger');
  const [matchScore, setMatchScore] = useState<number | null>(null);
  
  // Chat state
  const [messages, setMessages] = useState<{ sender: 'You' | 'Stranger'; text: string; timestamp: string }[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [messageWarning, setMessageWarning] = useState<string | null>(null);
  
  // Video state
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoStatus, setVideoStatus] = useState<'connecting' | 'connected' | 'failed'>('connecting');
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('good');
  const [currentQuality, setCurrentQuality] = useState<QualityLevel | null>(null);
  
  // UI state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [showControls, setShowControls] = useState(true);

  // Refs
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const qualityControllerRef = useRef<AdaptiveQualityController | null>(null);
  const webrtcConfigRef = useRef<WebRTCConfig | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
  }, [router]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  // Initialize socket connection
  useEffect(() => {
    if (!isAuthenticated()) return;

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    socketRef.current = socket;

    // Socket event listeners
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setError('Connection error. Please try again.');
    });

    socket.on('searching', (data) => {
      setChatState('searching');
      setSearchingMessage(data.message || "Looking for someone to chat with...");
      if (data.queueStats) {
        setUserCount(data.queueStats.total);
      }
    });

    socket.on('match_found', async (data) => {
      console.log('Match found:', data);
      setMatchId(data.matchId);
      setPartnerName(data.partner?.name || 'Stranger');
      setMatchScore(data.matchScore || null);
      setChatState('connected');
      setMessages([]);
      setError(null);
      setVideoStatus('connecting');
      
      // Store WebRTC config if provided
      if (data.webrtcConfig) {
        webrtcConfigRef.current = data.webrtcConfig;
      }
      
      // Initialize video call
      await initializeVideoCall(data.isInitiator, data.webrtcConfig);
    });

    socket.on('chat_message', (data) => {
      setMessages(prev => [...prev, {
        sender: 'Stranger',
        text: data.message,
        timestamp: data.timestamp || new Date().toISOString()
      }]);
      setPartnerTyping(false);
    });

    socket.on('typing', () => {
      setPartnerTyping(true);
      setTimeout(() => setPartnerTyping(false), 1500);
    });

    socket.on('webrtc_signal', (signal) => {
      console.log('Received WebRTC signal:', signal.type || 'candidate');
      if (peerRef.current) {
        peerRef.current.signal(signal);
      } else {
        console.warn('Received signal but peer not initialized');
      }
    });

    socket.on('call_ended', (data) => {
      handleCallEnd(data.reason);
    });

    socket.on('match_ended', () => {
      handleCallEnd('partner_left');
    });

    socket.on('match_error', (data) => {
      setError(data.message || 'Failed to find a match');
      setChatState('disconnected');
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

    return () => {
      socket.disconnect();
      cleanupVideoCall();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Initialize video call
  const initializeVideoCall = useCallback(async (isInitiator: boolean, webrtcConfig?: WebRTCConfig) => {
    try {
      console.log('Initializing video call, initiator:', isInitiator);
      
      // Clean up any existing peer connection
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }

      // Initialize adaptive quality controller
      qualityControllerRef.current = new AdaptiveQualityController('720p');
      qualityControllerRef.current.setOnQualityChange((quality) => {
        setCurrentQuality(quality);
      });

      // Get user media
      const constraints = {
        video: videoEnabled ? qualityControllerRef.current.getVideoConstraints() : false,
        audio: audioEnabled
      };

      console.log('Getting user media with constraints:', constraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      streamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Build SimplePeer config with custom ICE servers
      const peerConfig: SimplePeer.Options = {
        initiator: isInitiator,
        trickle: true,
        stream: stream,
      };

      // Add ICE servers from server config
      if (webrtcConfig?.iceServers) {
        peerConfig.config = {
          iceServers: webrtcConfig.iceServers,
          iceCandidatePoolSize: webrtcConfig.iceCandidatePoolSize || 10,
        };
      } else {
        // Fallback to default STUN servers
        peerConfig.config = {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
          iceCandidatePoolSize: 10,
        };
      }

      console.log('Creating SimplePeer with config:', peerConfig);

      const peer = new SimplePeer(peerConfig);

      peer.on('signal', (data: SimplePeer.SignalData) => {
        console.log('Sending WebRTC signal:', data.type || 'candidate');
        socketRef.current?.emit('webrtc_signal', data);
      });

      peer.on('stream', (remoteStream: MediaStream) => {
        console.log('Received remote stream');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          setVideoStatus('connected');
        }
      });

      peer.on('connect', () => {
        console.log('Peer connection established');
        setVideoStatus('connected');
        
        // Set up quality monitoring when connected
        const peerConnection = (peer as unknown as { _pc: RTCPeerConnection })._pc;
        if (qualityControllerRef.current && peerConnection) {
          qualityControllerRef.current.setPeerConnection(peerConnection);
        }
      });

      peer.on('error', (err) => {
        console.error('Peer error:', err);
        setVideoStatus('failed');
        setError('Video connection failed. Please try again.');
      });

      peer.on('close', () => {
        console.log('Peer connection closed');
        setVideoStatus('failed');
      });

      peerRef.current = peer;
    } catch (error) {
      console.error('Failed to initialize video call:', error);
      setVideoStatus('failed');
      setError('Failed to access camera/microphone. Please check permissions.');
    }
  }, [videoEnabled, audioEnabled]);

  const cleanupVideoCall = useCallback(() => {
    console.log('Cleaning up video call');
    
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

    if (qualityControllerRef.current) {
      qualityControllerRef.current.reset();
      qualityControllerRef.current = null;
    }
    
    setConnectionQuality('good');
    setCurrentQuality(null);
    setVideoStatus('connecting');
  }, []);

  // Event handlers
  const handleStartSearch = (preferences: { gender: 'male' | 'female' | 'both' }) => {
    setChatState('searching');
    setError(null);
    console.log('Starting search with preferences:', preferences);
    socketRef.current?.emit('find_match', { preferredGender: preferences.gender });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !matchId) return;

    const message = {
      sender: 'You' as const,
      text: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, message]);
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

  const handleReportUser = () => {
    if (matchId) {
      socketRef.current?.emit('report_user', { reason: 'inappropriate_behavior' });
    }
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render different states
  if (chatState === 'preferences') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        {/* Navigation */}
        <motion.nav 
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass border-b border-slate-800"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                  <Video className="w-5 h-5 text-slate-900" />
                </div>
                <span className="text-xl font-bold gradient-text">Chatterly</span>
              </div>
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Home</span>
              </button>
            </div>
          </div>
        </motion.nav>

        <div className="flex-1 flex items-center justify-center p-4">
          <PreferenceSelector onStart={handleStartSearch} />
        </div>
      </div>
    );
  }

  if (chatState === 'searching') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        {/* Navigation */}
        <nav className="glass border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                  <Video className="w-5 h-5 text-slate-900" />
                </div>
                <span className="text-xl font-bold gradient-text">Chatterly</span>
              </div>
            </div>
          </div>
        </nav>

        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div 
            initial="initial"
            animate="animate"
            variants={scaleIn}
            className="w-full max-w-md mx-auto glass rounded-2xl shadow-2xl p-8 text-center"
          >
            <div className="mb-8">
              <div className="relative inline-block">
                <div className="w-20 h-20 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Users className="w-8 h-8 text-cyan-400" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Finding someone...</h2>
              <p className="text-slate-400">{searchingMessage}</p>
            </div>
            
            {userCount > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl"
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <p className="text-cyan-400">
                    <span className="font-semibold">{userCount}</span> people waiting to chat
                  </p>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl"
              >
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  <p className="text-sm">{error}</p>
                </div>
              </motion.div>
            )}

            <button
              onClick={() => setChatState('preferences')}
              className="text-slate-400 hover:text-cyan-400 transition-colors"
            >
              Cancel and change preferences
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (chatState === 'disconnected') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        {/* Navigation */}
        <nav className="glass border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                  <Video className="w-5 h-5 text-slate-900" />
                </div>
                <span className="text-xl font-bold gradient-text">Chatterly</span>
              </div>
            </div>
          </div>
        </nav>

        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div 
            initial="initial"
            animate="animate"
            variants={scaleIn}
            className="w-full max-w-md mx-auto glass rounded-2xl shadow-2xl p-8 text-center"
          >
            <div className="mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
                <CheckCircle className="w-10 h-10 text-cyan-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Chat Ended</h2>
              <p className="text-slate-400">The conversation has ended</p>
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

            <div className="space-y-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNewChat}
                className="w-full py-3 px-6 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/25"
              >
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Start New Chat
                </span>
              </motion.button>
              <button
                onClick={() => router.push('/')}
                className="w-full py-3 px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-colors border border-slate-700"
              >
                Go Home
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Connected state - main chat interface
  return (
    <div className="h-screen w-full bg-slate-950 flex flex-col overflow-hidden">
      {/* Header */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="glass border-b border-slate-800 px-4 py-3"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                <Video className="w-5 h-5 text-slate-900" />
              </div>
              <div>
                <h1 className="font-bold text-white">Chatterly</h1>
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-slate-400">Connected to</span>
                  <span className="text-cyan-400 font-medium">{partnerName}</span>
                  {matchScore !== null && (
                    <span className="text-xs text-slate-500">
                      ({Math.round(matchScore * 100)}% match)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Connection Quality & Controls */}
          <div className="flex items-center gap-3">
            <ConnectionQualityIndicator 
              quality={connectionQuality} 
              currentQuality={currentQuality || undefined}
              showDetails={false}
            />
            
            <button
              onClick={handleReportUser}
              className="p-2 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
              title="Report User"
            >
              <Flag className="w-4 h-4" />
            </button>

            <button
              onClick={handleEndCall}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <PhoneOff className="w-4 h-4" />
              <span className="hidden sm:inline">End Call</span>
            </button>
          </div>
        </div>
      </motion.header>

      {/* Message Warning Toast */}
      <AnimatePresence>
        {messageWarning && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className="bg-yellow-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {messageWarning}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 relative bg-slate-900">
          {/* Remote Video */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          
          {/* Video Status Overlays */}
          <AnimatePresence>
            {videoStatus === 'connecting' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-slate-950/80"
              >
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-white text-lg">Connecting video...</p>
                  <p className="text-slate-400 text-sm mt-2">Setting up secure connection</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {videoStatus === 'failed' && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
              <div className="text-center">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
                  <VideoOff className="w-10 h-10 text-slate-400" />
                </div>
                <p className="text-white text-lg mb-2">Video unavailable</p>
                <p className="text-slate-400 text-sm">Connection failed or partner has no camera</p>
              </div>
            </div>
          )}

          {/* Local Video (Picture in Picture) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-4 right-4 w-32 h-24 sm:w-48 sm:h-36 bg-slate-800 rounded-xl overflow-hidden border-2 border-slate-700 shadow-2xl z-20"
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

          {/* Video Controls Overlay */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-3 z-30">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleVideo}
              className={`p-3 rounded-full transition-all ${
                videoEnabled 
                  ? 'bg-slate-700/80 text-white hover:bg-slate-600' 
                  : 'bg-rose-500 text-white hover:bg-rose-600'
              }`}
            >
              {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleAudio}
              className={`p-3 rounded-full transition-all ${
                audioEnabled 
                  ? 'bg-slate-700/80 text-white hover:bg-slate-600' 
                  : 'bg-rose-500 text-white hover:bg-rose-600'
              }`}
            >
              {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
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

        {/* Chat Sidebar */}
        <motion.div 
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full md:w-96 bg-slate-900/50 backdrop-blur-xl border-l border-slate-800 flex flex-col"
        >
          {/* Chat Header */}
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-slate-900" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Chat</h3>
                <p className="text-xs text-slate-400">Messages are not stored</p>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-slate-500 py-8">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-cyan-400/50" />
                </div>
                <p>Say hello to start the conversation!</p>
                <p className="text-xs mt-2 opacity-70">Be respectful and kind</p>
              </div>
            )}
            
            {messages.map((message, index) => (
              <motion.div
                key={index}
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
                  <p className={`text-xs mt-1 ${message.sender === 'You' ? 'text-cyan-100' : 'text-slate-500'}`}>
                    {formatTime(message.timestamp)}
                  </p>
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
                    <motion.div 
                      animate={{ y: [0, -4, 0] }}
                      transition={{ repeat: Infinity, duration: 0.5 }}
                      className="w-2 h-2 bg-slate-400 rounded-full"
                    />
                    <motion.div 
                      animate={{ y: [0, -4, 0] }}
                      transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }}
                      className="w-2 h-2 bg-slate-400 rounded-full"
                    />
                    <motion.div 
                      animate={{ y: [0, -4, 0] }}
                      transition={{ repeat: Infinity, duration: 0.5, delay: 0.2 }}
                      className="w-2 h-2 bg-slate-400 rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-slate-800">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Type a message..."
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-cyan-400 transition-colors"
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
                className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-5 h-5" />
              </motion.button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
