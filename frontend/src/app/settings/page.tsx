"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings, 
  Shield, 
  UserX, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  ArrowLeft,
  Mail,
  Users,
  Trash2,
  FileText,
  ChevronRight,
  Loader2,
  Lock,
  Eye,
  Globe,
  FileDown
} from "lucide-react";
import { 
  isAuthenticated, 
  getUser, 
  getBlockedUsers, 
  unblockUser, 
  exportUserData, 
  deleteAccount,
  resendVerificationEmail,
} from "../../utils/auth";

interface BlockedUser {
  id: string;
  name: string;
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

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'privacy' | 'blocked' | 'data'>('privacy');
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Delete account states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  
  const router = useRouter();
  const user = getUser();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    
    fetchBlockedUsers();
    setLoading(false);
  }, [router]);

  const fetchBlockedUsers = async () => {
    try {
      const result = await getBlockedUsers();
      setBlockedUsers(result.blockedUsers);
    } catch (error) {
      console.error('Error fetching blocked users:', error);
    }
  };

  const handleUnblock = async (userId: string) => {
    setActionLoading(true);
    try {
      await unblockUser(userId);
      setMessage({ type: 'success', text: 'User unblocked successfully' });
      fetchBlockedUsers();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to unblock user' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportData = async () => {
    setActionLoading(true);
    try {
      const blob = await exportUserData();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chatterly-data-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setMessage({ type: 'success', text: 'Data exported successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to export data' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      setMessage({ type: 'error', text: 'Please type DELETE to confirm' });
      return;
    }
    
    setActionLoading(true);
    try {
      await deleteAccount(deletePassword, deleteConfirmation);
      router.push('/');
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to delete account' });
      setActionLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setActionLoading(true);
    try {
      await resendVerificationEmail();
      setMessage({ type: 'success', text: 'Verification email sent! Please check your inbox.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to send verification email' });
    } finally {
      setActionLoading(false);
    }
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

  const tabs = [
    { id: 'privacy' as const, label: 'Privacy', icon: Lock, color: 'from-emerald-400 to-teal-500' },
    { id: 'blocked' as const, label: 'Blocked Users', icon: UserX, color: 'from-rose-400 to-pink-500' },
    { id: 'data' as const, label: 'Your Data', icon: FileDown, color: 'from-cyan-400 to-blue-500' },
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navigation */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="glass border-b border-slate-800 sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                <Settings className="w-5 h-5 text-slate-900" />
              </div>
              <span className="text-xl font-bold gradient-text">Settings</span>
            </div>
            <button
              onClick={() => router.push('/profile')}
              className="px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-xl transition-all flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Profile
            </button>
          </div>
        </div>
      </motion.nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div 
          initial="initial"
          animate="animate"
          variants={staggerContainer}
          className="mb-8"
        >
          <motion.div variants={fadeInUp}>
            <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
            <p className="text-slate-400">Manage your account and privacy preferences</p>
          </motion.div>
        </motion.div>

        {/* Message */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                message.type === 'success' 
                  ? 'bg-emerald-500/10 border border-emerald-500/30' 
                  : 'bg-rose-500/10 border border-rose-500/30'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              )}
              <p className={message.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}>
                {message.text}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
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
            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="p-6 sm:p-8 space-y-6">
                {/* Email Verification */}
                {!user?.isEmailVerified && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-6 h-6 text-yellow-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-yellow-400 mb-2">Email Not Verified</h3>
                        <p className="text-slate-400 text-sm mb-4">
                          Please verify your email address to access all features.
                        </p>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleResendVerification}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                          {actionLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Mail className="w-4 h-4" />
                          )}
                          Resend Verification Email
                        </motion.button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Privacy Settings Info */}
                <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-6 h-6 text-slate-900" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-3">Your Privacy is Protected</h3>
                      <ul className="text-slate-400 text-sm space-y-2">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          Video/audio is peer-to-peer encrypted
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          Chat messages are not stored
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          Your location is never shared
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          Passwords are securely hashed
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Legal Documents */}
                <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-slate-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-3">Legal Documents</h3>
                      <div className="flex flex-wrap gap-3">
                        {[
                          { label: 'Privacy Policy', href: '/privacy' },
                          { label: 'Terms of Service', href: '/terms' },
                          { label: 'Safety Center', href: '/safety' },
                        ].map((doc) => (
                          <button
                            key={doc.href}
                            onClick={() => router.push(doc.href)}
                            className="px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-cyan-400 rounded-lg transition-all text-sm flex items-center gap-2"
                          >
                            {doc.label}
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Blocked Users Tab */}
            {activeTab === 'blocked' && (
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-rose-400 to-pink-500 flex items-center justify-center">
                    <UserX className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Blocked Users</h3>
                    <p className="text-slate-400 text-sm">Users you&apos;ve blocked will not be able to match with you</p>
                  </div>
                </div>
                
                {blockedUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-10 h-10 text-slate-500" />
                    </div>
                    <p className="text-slate-400">You haven&apos;t blocked anyone yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {blockedUsers.map((blocked) => (
                      <motion.div
                        key={blocked.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between bg-slate-800/30 border border-slate-700 rounded-xl p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-600 rounded-full flex items-center justify-center font-bold text-slate-300">
                            {blocked.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-white">{blocked.name}</span>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleUnblock(blocked.id)}
                          disabled={actionLoading}
                          className="px-4 py-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all disabled:opacity-50"
                        >
                          Unblock
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Data Tab */}
            {activeTab === 'data' && (
              <div className="p-6 sm:p-8 space-y-6">
                {/* Export Data */}
                <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                      <Download className="w-6 h-6 text-slate-900" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-2">Export Your Data</h3>
                      <p className="text-slate-400 text-sm mb-4">
                        Download all of your personal data in JSON format (GDPR compliant).
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleExportData}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {actionLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        {actionLoading ? 'Exporting...' : 'Export Data'}
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Delete Account */}
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                      <Trash2 className="w-6 h-6 text-rose-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-rose-400 mb-2">Delete Account</h3>
                      <p className="text-slate-400 text-sm mb-4">
                        This action is permanent and cannot be undone. All your data will be deleted.
                      </p>
                      
                      {!showDeleteConfirm ? (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setShowDeleteConfirm(true)}
                          className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-all"
                        >
                          Delete My Account
                        </motion.button>
                      ) : (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-4"
                        >
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Enter your password
                            </label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                              <input
                                type="password"
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 transition-all"
                                placeholder="Your password"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Type DELETE to confirm
                            </label>
                            <input
                              type="text"
                              value={deleteConfirmation}
                              onChange={(e) => setDeleteConfirmation(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 transition-all"
                              placeholder="Type DELETE"
                            />
                          </div>
                          <div className="flex gap-3">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={handleDeleteAccount}
                              disabled={actionLoading || deleteConfirmation !== 'DELETE'}
                              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                              {actionLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                              {actionLoading ? 'Deleting...' : 'Confirm Delete'}
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                setShowDeleteConfirm(false);
                                setDeletePassword('');
                                setDeleteConfirmation('');
                              }}
                              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-all"
                            >
                              Cancel
                            </motion.button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
