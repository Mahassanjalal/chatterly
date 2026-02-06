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
  Crown
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

  // Determine available options based on user type
  const getGenderOptions = () => {
    const baseOptions = [
      { 
        value: 'both' as const, 
        label: 'Everyone', 
        icon: Users,
        description: 'Chat with anyone',
        color: 'from-cyan-400 to-blue-500'
      }
    ];

    if (!user) return baseOptions;

    if (user.type === 'free') {
      // Free users can only select 'both' or same gender
      if (user.gender) {
        const sameGenderOption = {
          value: user.gender as 'male' | 'female',
          label: user.gender === 'male' ? 'Male' : 'Female',
          icon: User,
          description: `${user.gender === 'male' ? 'Males' : 'Females'} only`,
          color: user.gender === 'male' ? 'from-blue-400 to-indigo-500' : 'from-pink-400 to-rose-500'
        };
        return [baseOptions[0], sameGenderOption];
      }
      return baseOptions;
    } else {
      // Pro users get all options
      return [
        ...baseOptions,
        { 
          value: 'male' as const, 
          label: 'Male', 
          icon: User,
          description: 'Males only',
          color: 'from-blue-400 to-indigo-500'
        },
        { 
          value: 'female' as const, 
          label: 'Female', 
          icon: User,
          description: 'Females only',
          color: 'from-pink-400 to-rose-500'
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
      className="w-full max-w-lg mx-auto glass rounded-2xl shadow-2xl p-8"
    >
      {/* Profile Button */}
      <motion.div variants={fadeInUp} className="flex justify-end mb-6">
        <button
          onClick={() => router.push('/profile')}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-xl transition-all border border-slate-700/50"
        >
          <User className="w-4 h-4" />
          <span>Profile</span>
        </button>
      </motion.div>

      {/* Header */}
      <motion.div variants={fadeInUp} className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <Video className="w-8 h-8 text-slate-900" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">
          Ready to Connect?
        </h2>
        <p className="text-slate-400">
          Choose your preference and start meeting amazing people
        </p>
        {user && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700">
            {user.type === 'pro' ? (
              <>
                <Crown className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 font-medium">PRO Member</span>
              </>
            ) : (
              <>
                <Star className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400">Free Account</span>
              </>
            )}
          </div>
        )}
      </motion.div>

      {/* Gender Preference Selection */}
      <motion.div variants={fadeInUp} className="mb-8">
        <label className="block text-sm font-medium text-slate-300 mb-4">
          I want to chat with:
        </label>
        <div className="grid grid-cols-1 gap-3">
          {genderOptions.map((option, index) => (
            <motion.button
              key={option.value}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedGender(option.value)}
              className={`flex items-center p-4 rounded-xl border-2 transition-all duration-200 ${
                selectedGender === option.value
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              }`}
            >
              <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r ${option.color} mr-4`}>
                <option.icon className="w-6 h-6 text-slate-900" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-white">{option.label}</div>
                <div className="text-sm text-slate-400">{option.description}</div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                selectedGender === option.value
                  ? 'border-cyan-500 bg-cyan-500'
                  : 'border-slate-600'
              }`}>
                {selectedGender === option.value && (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* User Type Info */}
      {user && user.type === 'free' && (
        <motion.div 
          variants={fadeInUp}
          className="mb-6 p-5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/30"
        >
          <div className="flex items-center gap-3 mb-3">
            <Crown className="w-5 h-5 text-amber-400" />
            <span className="font-semibold text-amber-400">Upgrade to PRO</span>
          </div>
          <ul className="text-sm text-slate-300 space-y-2 mb-4">
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
              Choose any gender preference
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
              80% opposite gender matches
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
              Priority matching
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
              Advanced filters (coming soon)
            </li>
          </ul>
          <button 
            onClick={() => router.push('/profile')}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-amber-500/25 transition-all flex items-center justify-center gap-2"
          >
            <Crown className="w-4 h-4" />
            Upgrade to PRO
            <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Safety Reminder */}
      <motion.div 
        variants={fadeInUp}
        className="mb-8 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50"
      >
        <div className="flex items-center gap-3 mb-3">
          <Shield className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold text-white">Safety First</span>
        </div>
        <ul className="text-sm text-slate-400 space-y-1.5">
          <li className="flex items-center gap-2">
            <div className="w-1 h-1 bg-emerald-400 rounded-full"></div>
            Keep personal information private
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1 h-1 bg-emerald-400 rounded-full"></div>
            Report inappropriate behavior
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1 h-1 bg-emerald-400 rounded-full"></div>
            You can end the chat anytime
          </li>
          {user && user.type === 'free' && (
            <li className="flex items-center gap-2 text-amber-400/80">
              <div className="w-1 h-1 bg-amber-400 rounded-full"></div>
              Free users: 80% same gender matches
            </li>
          )}
        </ul>
      </motion.div>

      {/* Start Button */}
      <motion.button
        variants={fadeInUp}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleStart}
        disabled={loading}
        className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-3 ${
          loading
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg shadow-cyan-500/25'
        }`}
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
            Finding someone...
          </>
        ) : (
          <>
            <Video className="w-5 h-5" />
            Start Video Chat
            <ChevronRight className="w-5 h-5" />
          </>
        )}
      </motion.button>

      {/* Skip Option */}
      <motion.div variants={fadeInUp} className="mt-4 text-center">
        <button
          onClick={() => onStart({ gender: 'both' })}
          disabled={loading}
          className="text-sm text-slate-500 hover:text-cyan-400 transition-colors"
        >
          Or start with default settings
        </button>
      </motion.div>
    </motion.div>
  );
}
