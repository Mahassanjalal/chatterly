"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  User, 
  Users, 
  Star, 
  Shield, 
  Video,
  ChevronRight,
  Crown,
  Globe,
  Zap,
  Sparkles,
  Lock,
  CheckCircle,
  TrendingUp,
  Clock
} from "lucide-react";
import { getUser, User as UserType } from "../utils/auth";

interface PreferenceSelectorProps {
  onStart: (preferences: { gender: 'male' | 'female' | 'both' }) => void;
  loading?: boolean;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function PreferenceSelector({ onStart, loading }: PreferenceSelectorProps) {
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | 'both'>('both');
  const [user, setUser] = useState<UserType | null>(null);
  const router = useRouter();

  useEffect(() => {
    const currentUser = getUser();
    setUser(currentUser);
  }, []);

  const getGenderOptions = () => {
    const baseOptions = [
      { 
        value: 'both' as const, 
        label: 'Everyone', 
        icon: Users,
        description: 'Chat with anyone worldwide',
        color: 'from-cyan-400 to-blue-500',
        badge: 'Popular'
      }
    ];

    if (!user) return baseOptions;

    if (user.type === 'free') {
      if (user.gender) {
        const sameGenderOption = {
          value: user.gender as 'male' | 'female',
          label: user.gender === 'male' ? 'Male Only' : 'Female Only',
          icon: User,
          description: `${user.gender === 'male' ? 'Males' : 'Females'} only`,
          color: user.gender === 'male' ? 'from-blue-400 to-indigo-500' : 'from-pink-400 to-rose-500',
          badge: null
        };
        return [baseOptions[0], sameGenderOption];
      }
      return baseOptions;
    } else {
      return [
        ...baseOptions,
        { 
          value: 'male' as const, 
          label: 'Male Only', 
          icon: User,
          description: 'Connect with males',
          color: 'from-blue-400 to-indigo-500',
          badge: 'PRO'
        },
        { 
          value: 'female' as const, 
          label: 'Female Only', 
          icon: User,
          description: 'Connect with females',
          color: 'from-pink-400 to-rose-500',
          badge: 'PRO'
        },
      ];
    }
  };

  const genderOptions = getGenderOptions();

  const handleStart = () => {
    onStart({ gender: selectedGender });
  };

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className="w-full max-w-xl mx-auto"
    >
      {/* Main Card */}
      <div className="glass rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <motion.div 
          variants={fadeInUp}
          className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-b border-slate-700/50 p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-cyan-500/25"
          >
            <Video className="w-10 h-10 text-slate-900" />
          </motion.div>
          
          <h2 className="text-3xl font-bold text-white mb-2">
            Ready to Connect?
          </h2>
          <p className="text-slate-400 max-w-sm mx-auto">
            Choose who you&apos;d like to meet and start an amazing conversation
          </p>
          
          {user && (
            <div className="mt-4 flex items-center justify-center gap-2">
              {user.type === 'pro' ? (
                <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-semibold flex items-center gap-1.5">
                  <Crown className="w-4 h-4" />
                  PRO Member
                </span>
              ) : (
                <span className="px-4 py-1.5 rounded-full bg-slate-700 text-slate-300 text-sm font-medium flex items-center gap-1.5">
                  <Star className="w-4 h-4" />
                  Free Account
                </span>
              )}
            </div>
          )}
        </motion.div>

        {/* Content */}
        <div className="p-8">
          {/* Gender Selection */}
          <motion.div variants={fadeInUp} className="mb-8">
            <label className="block text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" />
              I want to chat with:
            </label>
            <div className="space-y-3">
              {genderOptions.map((option, index) => (
                <motion.button
                  key={option.value}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedGender(option.value)}
                  className={`w-full flex items-center p-4 rounded-xl border-2 transition-all duration-200 ${
                    selectedGender === option.value
                      ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/10'
                      : 'border-slate-700 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50'
                  }`}
                >
                  <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r ${option.color} mr-4 shadow-lg`}>
                    <option.icon className="w-6 h-6 text-slate-900" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{option.label}</span>
                      {option.badge && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          option.badge === 'PRO' 
                            ? 'bg-amber-500/20 text-amber-400' 
                            : 'bg-cyan-500/20 text-cyan-400'
                        }`}>
                          {option.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-400">{option.description}</div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedGender === option.value
                      ? 'border-cyan-500 bg-cyan-500'
                      : 'border-slate-600'
                  }`}>
                    {selectedGender === option.value && (
                      <CheckCircle className="w-4 h-4 text-white" />
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Features */}
          <motion.div variants={fadeInUp} className="mb-8">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-emerald-400" />
                </div>
                <span>Secure & Private</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-cyan-400" />
                </div>
                <span>Lightning Fast</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-purple-400" />
                </div>
                <span>Global Network</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <span>AI Matching</span>
              </div>
            </div>
          </motion.div>

          {/* PRO Upgrade (for free users) */}
          {user && user.type === 'free' && (
            <motion.div 
              variants={fadeInUp}
              className="mb-8 p-5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl border border-amber-500/30"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-400 mb-2">Upgrade to PRO</h3>
                  <ul className="text-sm text-slate-300 space-y-1.5 mb-4">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-amber-400" />
                      Choose any gender preference
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-amber-400" />
                      80% opposite gender matches
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-amber-400" />
                      Priority matching queue
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-amber-400" />
                      Advanced filters
                    </li>
                  </ul>
                  <button 
                    onClick={() => router.push('/profile')}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-amber-500/25 transition-all flex items-center justify-center gap-2"
                  >
                    <Crown className="w-4 h-4" />
                    Upgrade Now
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Safety Info */}
          <motion.div 
            variants={fadeInUp}
            className="mb-8 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <span className="font-semibold text-white">Safety First</span>
                <p className="text-xs text-slate-400">Your security is our priority</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                Encrypted video calls
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                No chat history stored
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                Report inappropriate users
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                End chat anytime
              </div>
            </div>
          </motion.div>

          {/* Start Button */}
          <motion.button
            variants={fadeInUp}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStart}
            disabled={loading}
            className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center gap-3 ${
              loading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg shadow-cyan-500/25'
            }`}
          >
            {loading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full"
                />
                Finding match...
              </>
            ) : (
              <>
                <Video className="w-5 h-5" />
                Start Video Chat
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
