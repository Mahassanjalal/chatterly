"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, User } from "../utils/auth";

interface PreferenceSelectorProps {
  onStart: (preferences: { gender: 'male' | 'female' | 'both' }) => void;
  loading?: boolean;
}

export default function PreferenceSelector({ onStart, loading }: PreferenceSelectorProps) {
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | 'both'>('both');
  const [user, setUser] = useState<User | null>(null);
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
        icon: '👥',
        description: 'Chat with anyone'
      }
    ];

    if (!user) return baseOptions;

    if (user.type === 'free') {
      // Free users can only select 'both' or same gender
      if (user.gender) {
        const sameGenderOption = {
          value: user.gender as 'male' | 'female',
          label: user.gender === 'male' ? 'Male' : 'Female',
          icon: user.gender === 'male' ? '👨' : '👩',
          description: `${user.gender === 'male' ? 'Males' : 'Females'} only`
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
          icon: '👨',
          description: 'Males only'
        },
        { 
          value: 'female' as const, 
          label: 'Female', 
          icon: '👩',
          description: 'Females only'
        },
      ];
    }
  };

  const genderOptions = getGenderOptions();

  const handleStart = () => {
    onStart({ gender: selectedGender });
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-8">
      {/* Profile Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => router.push('/profile')}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
        >
          <span>👤</span>
          <span>Profile</span>
        </button>
      </div>

      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            Find someone to chat with
          </h2>
          {user && (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              user.type === 'pro' 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                : 'bg-gray-200 text-gray-600'
            }`}>
              {user.type === 'pro' ? '⭐ PRO' : '🆓 FREE'}
            </span>
          )}
        </div>
        <p className="text-gray-600">
          Choose your preference and start connecting
        </p>
      </div>

      {/* Gender Preference Selection */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-4">
          I want to chat with:
        </label>
        <div className="grid grid-cols-1 gap-3">
          {genderOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedGender(option.value)}
              className={`flex items-center p-4 rounded-xl border-2 transition-all duration-200 ${
                selectedGender === option.value
                  ? 'border-blue-500 bg-blue-50 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mr-4">
                <span className="text-2xl">{option.icon}</span>
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-gray-800">{option.label}</div>
                <div className="text-sm text-gray-500">{option.description}</div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedGender === option.value
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300'
              }`}>
                {selectedGender === option.value && (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* User Type Info */}
      {user && user.type === 'free' && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-lg">⭐</span>
            <span className="font-medium text-blue-800">Upgrade to PRO</span>
          </div>
          <ul className="text-sm text-blue-700 space-y-1 mb-3">
            <li>• Choose any gender preference</li>
            <li>• 80% opposite gender matches</li>
            <li>• Priority matching</li>
            <li>• Advanced filters (coming soon)</li>
          </ul>
          <button className="w-full py-2 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all">
            Upgrade to PRO
          </button>
        </div>
      )}

      {/* Additional Options */}
      <div className="mb-8 p-4 bg-gray-50 rounded-xl">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-lg">⚠️</span>
          <span className="font-medium text-gray-800">Safety Reminder</span>
        </div>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Keep personal information private</li>
          <li>• Report inappropriate behavior</li>
          <li>• You can end the chat anytime</li>
          {user && user.type === 'free' && (
            <li>• Free users: 80% same gender matches</li>
          )}
        </ul>
      </div>

      {/* Start Button */}
      <button
        onClick={handleStart}
        disabled={loading}
        className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${
          loading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            Finding someone...
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
            Start Video Chat
          </div>
        )}
      </button>

      {/* Skip Option */}
      <div className="mt-4 text-center">
        <button
          onClick={() => onStart({ gender: 'both' })}
          disabled={loading}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Or start with default settings
        </button>
      </div>
    </div>
  );
}
