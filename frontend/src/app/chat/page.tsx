"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import io from "socket.io-client";
import SimplePeer from "simple-peer";
import EmojiPicker from "../../components/EmojiPicker";
import PreferenceSelector from "../../components/PreferenceSelector";
import { isAuthenticated } from "../../utils/auth";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type ChatState = 'preferences' | 'searching' | 'connected' | 'disconnected';

export default function ChatPage() {
  const router = useRouter();
  
  // Core state
  const [chatState, setChatState] = useState<ChatState>('preferences');
  const [error, setError] = useState<string | null>(null);
  const [searchingMessage, setSearchingMessage] = useState("Looking for someone to chat with...");
  
  // Match state
  const [matchId, setMatchId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string>('Stranger');
  
  // Chat state
  const [messages, setMessages] = useState<{ sender: 'You' | 'Stranger'; text: string; timestamp: string }[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  
  // Video state
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoStatus, setVideoStatus] = useState<'connecting' | 'connected' | 'failed'>('connecting');
  
  // UI state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [userCount, setUserCount] = useState(0);

  // Refs
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
  }, [router]);

  // Initialize socket connection
  useEffect(() => {
    if (!isAuthenticated()) return;

    const socket = io(SOCKET_URL, {
      withCredentials: true // Important for cookies
    });

    socketRef.current = socket;

    // Socket event listeners
    socket.on('searching', (data) => {
      setChatState('searching');
      setSearchingMessage(data.message || "Looking for someone to chat with...");
      if (data.queueStats) {
        setUserCount(data.queueStats.total);
      }
    });

    socket.on('match_found', async (data) => {
      setMatchId(data.matchId);
      setPartnerName(data.partner?.name || 'Stranger');
      setChatState('connected');
      setMessages([]);
      setError(null);
      
      // Initialize video call
      await initializeVideoCall(data.isInitiator);
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
      if (peerRef.current) {
        peerRef.current.signal(signal);
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

    return () => {
      socket.disconnect();
      cleanupVideoCall();
    };
  }, [router, handleCallEnd, initializeVideoCall, cleanupVideoCall]);

  // Initialize video call
  const initializeVideoCall = useCallback(async (isInitiator: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: videoEnabled, 
        audio: audioEnabled 
      });
      
      streamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const peer = new SimplePeer({
        initiator: isInitiator,
        trickle: false,
        stream: stream,
      });

      peer.on('signal', (data: SimplePeer.SignalData) => {
        socketRef.current?.emit('webrtc_signal', data);
      });

      peer.on('stream', (remoteStream: MediaStream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          setVideoStatus('connected');
        }
      });

      peer.on('error', () => {
        setVideoStatus('failed');
      });

      peer.on('close', () => {
        setVideoStatus('failed');
      });

      peerRef.current = peer;
    } catch (error) {
      console.error('Failed to initialize video call:', error);
      setVideoStatus('failed');
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
  }, []);

  // Event handlers
  const handleStartSearch = (preferences: { gender: 'male' | 'female' | 'both' }) => {
    setChatState('searching');
    setError(null);
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

  // Render different states
  if (chatState === 'preferences') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <PreferenceSelector onStart={handleStartSearch} />
      </div>
    );
  }

  if (chatState === 'searching') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-8">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Finding someone...</h2>
            <p className="text-gray-600">{searchingMessage}</p>
          </div>
          
          {userCount > 0 && (
            <div className="mb-6 p-4 bg-blue-50 rounded-xl">
              <p className="text-sm text-blue-600">
                <span className="font-semibold">{userCount}</span> people waiting to chat
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 rounded-xl">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={() => setChatState('preferences')}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel and change preferences
          </button>
        </div>
      </div>
    );
  }

  if (chatState === 'disconnected') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-8">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Chat Ended</h2>
            <p className="text-gray-600">The conversation has ended</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 rounded-xl">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleNewChat}
              className="w-full py-3 px-6 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
            >
              Start New Chat
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Connected state - main chat interface
  return (
    <div className="h-screen w-full bg-gray-900 flex flex-col bg-gradient-to-br from-purple-600 via-pink-500 to-red-400">
      {/* Header */}
      <header className="bg-gray-800 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Chatterly</h1>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm">Connected to {partnerName}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={toggleVideo}
            className={`p-2 rounded-lg transition-colors ${
              videoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
          </button>
          
          <button
            onClick={toggleAudio}
            className={`p-2 rounded-lg transition-colors ${
              audioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1c-1.66 0-3 1.34-3 3v6c0 1.66 1.34 3 3 3s3-1.34 3-3V4c0-1.66-1.34-3-3-3z"/>
              <path d="M19 10v2c0 3.87-3.13 7-7 7s-7-3.13-7-7v-2H3v2c0 4.97 4.03 9 9 9s9-4.03 9-9v-2h-2z"/>
            </svg>
          </button>

          <button
            onClick={handleReportUser}
            className="p-2 rounded-lg bg-yellow-600 hover:bg-yellow-700 transition-colors"
            title="Report User"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>
          </button>

          <button
            onClick={handleEndCall}
            className="p-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              <path d="M18 8c0-3.31-2.69-6-6-6S6 4.69 6 8c0 4.5 6 11 6 11s6-6.5 6-11z"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Video Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Remote Video */}
        <div className="flex-1 relative bg-black">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          
          {videoStatus === 'connecting' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-white text-center">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p>Connecting video...</p>
              </div>
            </div>
          )}

          {videoStatus === 'failed' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="text-white text-center">
                <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <p>Video unavailable</p>
              </div>
            </div>
          )}

          {/* Local Video (Picture in Picture) */}
          <div className="absolute top-4 right-4 w-24 h-18 md:w-32 md:h-24 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600 shadow-lg z-20">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Chat Sidebar */}
        <div className="w-full md:w-80 h-1/2 md:h-full bg-white flex flex-col border-t md:border-t-0 md:border-l border-gray-200">
          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <p>Say hello to start the conversation!</p>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.sender === 'You' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg ${
                    message.sender === 'You'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                </div>
              </div>
            ))}
            
            {partnerTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-200 px-3 py-2 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Type a message..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  😊
                </button>
                
                {showEmojiPicker && (
                  <div className="absolute bottom-full right-0 mb-2">
                    <EmojiPicker
                      onSelect={(emoji) => {
                        setInput(prev => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                    />
                  </div>
                )}
              </div>
              
              <button
                type="submit"
                disabled={!input.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
