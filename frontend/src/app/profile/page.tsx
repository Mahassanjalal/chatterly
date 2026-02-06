"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, 
  Settings, 
  Shield, 
  Crown, 
  ArrowLeft,
  LogOut,
  ChevronRight,
  Star,
  CheckCircle,
  AlertCircle,
  Camera,
  Mail,
  Calendar,
  Users
} from "lucide-react";
import { getUser, isAuthenticated, User as UserType } from "../../utils/auth";
import ProfileEditForm from "../../components/ProfileEditForm";
import PasswordChangeForm from "../../components/PasswordChangeForm";
import ProUpgrade from "../../components/ProUpgrade";
import ChatLayout from "../chat/layout";

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

export default function ProfilePage() {
  const [user, setUser] = useState<UserType | null>(null);
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

  const handleUserUpdate = (updatedUser: Partial<UserType>) => {
    setUser(prev => prev ? { ...prev, ...updatedUser } : null);
  };

  const handleLogout = () => {
    localStorage.removeItem('chatterly_user');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Please log in to view your profile</div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User, color: 'from-cyan-400 to-blue-500' },
    { id: 'password' as const, label: 'Security', icon: Shield, color: 'from-emerald-400 to-teal-500' },
    ...(user.type === 'free' ? [{ id: 'upgrade' as const, label: 'Upgrade', icon: Crown, color: 'from-amber-400 to-orange-500' }] : []),
  ];

  return (
    <ChatLayout>
<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <motion.div 
          initial="initial"
          animate="animate"
          variants={staggerContainer}
          className="mb-8"
        >
          <motion.div 
            variants={fadeInUp}
            className="glass rounded-2xl p-6 sm:p-8"
          >
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-slate-900 text-4xl font-bold shadow-lg shadow-cyan-500/25">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-2 -right-2">
                  {user.type === 'pro' ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                      <Crown className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border-2 border-slate-600">
                      <Star className="w-4 h-4 text-slate-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center gap-3 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">{user.name}</h1>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    user.type === 'pro' 
                      ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' 
                      : 'bg-slate-700 text-slate-300'
                  }`}>
                    {user.type === 'pro' ? 'PRO' : 'FREE'}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4 text-slate-400">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{user.email}</span>
                  </div>
                  {user.gender && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span className="capitalize">{user.gender}</span>
                    </div>
                  )}
                </div>
                
                {/* Verification Status */}
                <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-2">
                  {user.isEmailVerified ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs text-emerald-400">Email Verified</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full">
                      <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />
                      <span className="text-xs text-yellow-400">Email Not Verified</span>
                    </div>
                  )}
                  {(user.role === 'admin' || user.role === 'moderator') && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full">
                      <Shield className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-xs text-purple-400 capitalize">{user.role}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-col gap-2">
                {(user.role === 'admin' || user.role === 'moderator') && (
                  <button
                    onClick={() => router.push('/admin')}
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    Admin Panel
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-700"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="glass rounded-xl p-1.5">
            <div className="flex flex-wrap gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-slate-800 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${tab.color} flex items-center justify-center`}>
                    <tab.icon className="w-4 h-4 text-slate-900" />
                  </div>
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="glass rounded-2xl overflow-hidden"
          >
            {activeTab === 'profile' && (
              <ProfileEditForm user={user} onUserUpdate={handleUserUpdate} />
            )}
            {activeTab === 'password' && (
              <PasswordChangeForm />
            )}
            {activeTab === 'upgrade' && user.type === 'free' && (
              <ProUpgrade user={user} onUserUpdate={handleUserUpdate} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </ChatLayout>
    // <div className="min-h-screen bg-slate-950">
    //   {/* Navigation */}
    //   {/* <motion.nav 
    //     initial={{ y: -100 }}
    //     animate={{ y: 0 }}
    //     className="glass border-b border-slate-800 sticky top-0 z-50"
    //   >
    //     <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    //       <div className="flex items-center justify-between h-16">
    //         <div className="flex items-center gap-3">
    //           <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
    //             <Users className="w-5 h-5 text-slate-900" />
    //           </div>
    //           <span className="text-xl font-bold gradient-text">Chatterly</span>
    //         </div>
    //         <div className="flex items-center gap-2">
    //           <button
    //             onClick={() => router.push('/chat')}
    //             className="px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-xl transition-all flex items-center gap-2"
    //           >
    //             <ArrowLeft className="w-4 h-4" />
    //             <span className="hidden sm:inline">Back to Chat</span>
    //           </button>
    //           <button
    //             onClick={() => router.push('/settings')}
    //             className="p-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-xl transition-all"
    //           >
    //             <Settings className="w-5 h-5" />
    //           </button>
    //         </div>
    //       </div>
    //     </div>
    //   </motion.nav> */}

      
    // </div>
  );
}
