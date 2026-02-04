"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, isAuthenticated } from "../../utils/auth";
import { User } from "../../utils/auth";
import ProfileEditForm from "../../components/ProfileEditForm";
import PasswordChangeForm from "../../components/PasswordChangeForm";
import ProUpgrade from "../../components/ProUpgrade";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'upgrade'>('profile');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    const currentUser = getUser();
    setUser(currentUser);
    setLoading(false);
  }, [router]);

  const handleUserUpdate = (updatedUser: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updatedUser } : null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-400 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-400 flex items-center justify-center">
        <div className="text-white text-xl">Please log in to view your profile</div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: '👤' },
    { id: 'password' as const, label: 'Security', icon: '🔒' },
    ...(user.type === 'free' ? [{ id: 'upgrade' as const, label: 'Upgrade', icon: '⭐' }] : []),
  ];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-purple-600 via-pink-500 to-red-400 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-white">My Profile</h1>
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/settings')}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
              >
                ⚙️ Settings
              </button>
              {(user.role === 'admin' || user.role === 'moderator') && (
                <button
                  onClick={() => router.push('/admin')}
                  className="bg-yellow-500/80 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  🛡️ Admin
                </button>
              )}
              <button
                onClick={() => router.push('/chat')}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
              >
                ← Back to Chat
              </button>
            </div>
          </div>
          
          {/* User Info Header */}
          <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{user.name}</h2>
                <p className="text-gray-600">{user.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    user.type === 'pro' 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {user.type === 'pro' ? '⭐ PRO' : '🆓 FREE'}
                  </span>
                  {user.gender && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      {user.gender.charAt(0).toUpperCase() + user.gender.slice(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-white/20 backdrop-blur-lg rounded-xl p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-purple-600 shadow-lg'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl">
          {activeTab === 'profile' && (
            <ProfileEditForm user={user} onUserUpdate={handleUserUpdate} />
          )}
          {activeTab === 'password' && (
            <PasswordChangeForm />
          )}
          {activeTab === 'upgrade' && user.type === 'free' && (
            <ProUpgrade user={user} onUserUpdate={handleUserUpdate} />
          )}
        </div>
      </div>
    </div>
  );
}
