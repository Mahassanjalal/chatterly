"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  isAuthenticated, 
  getUser, 
  getBlockedUsers, 
  unblockUser, 
  exportUserData, 
  deleteAccount,
  resendVerificationEmail,
  apiRequest 
} from "../../utils/auth";

interface BlockedUser {
  id: string;
  name: string;
}

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
    } finally {
      setActionLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setActionLoading(true);
    try {
      await resendVerificationEmail();
      setMessage({ type: 'success', text: 'Verification email sent! Please check your inbox.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to send verification email' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600">Manage your account and privacy</p>
          </div>
          <Link
            href="/profile"
            className="px-4 py-2 bg-white text-gray-700 rounded-lg shadow hover:bg-gray-50"
          >
            ← Back to Profile
          </Link>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-md mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('privacy')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                activeTab === 'privacy'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🔒 Privacy
            </button>
            <button
              onClick={() => setActiveTab('blocked')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                activeTab === 'blocked'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🚫 Blocked Users
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                activeTab === 'data'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📊 Your Data
            </button>
          </div>

          <div className="p-6">
            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                {/* Email Verification */}
                {!user?.isEmailVerified && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="font-semibold text-yellow-800 mb-2">📧 Email Not Verified</h3>
                    <p className="text-yellow-700 text-sm mb-3">
                      Please verify your email address to access all features.
                    </p>
                    <button
                      onClick={handleResendVerification}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
                    >
                      Resend Verification Email
                    </button>
                  </div>
                )}

                {/* Privacy Settings Info */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">🔐 Your Privacy is Protected</h3>
                  <ul className="text-gray-600 text-sm space-y-2">
                    <li>✅ Video/audio is peer-to-peer encrypted</li>
                    <li>✅ Chat messages are not stored</li>
                    <li>✅ Your location is never shared</li>
                    <li>✅ Passwords are securely hashed</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">📜 Legal Documents</h3>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/privacy" className="text-purple-600 hover:text-purple-700">
                      Privacy Policy
                    </Link>
                    <span className="text-gray-300">|</span>
                    <Link href="/terms" className="text-purple-600 hover:text-purple-700">
                      Terms of Service
                    </Link>
                    <span className="text-gray-300">|</span>
                    <Link href="/safety" className="text-purple-600 hover:text-purple-700">
                      Safety Center
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Blocked Users Tab */}
            {activeTab === 'blocked' && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-4">Blocked Users</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Users you&apos;ve blocked will not be able to match with you.
                </p>
                
                {blockedUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🤝</div>
                    <p>You haven&apos;t blocked anyone yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {blockedUsers.map((blocked) => (
                      <div
                        key={blocked.id}
                        className="flex items-center justify-between bg-gray-50 rounded-lg p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center font-bold text-gray-600">
                            {blocked.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{blocked.name}</span>
                        </div>
                        <button
                          onClick={() => handleUnblock(blocked.id)}
                          disabled={actionLoading}
                          className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                        >
                          Unblock
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Data Tab */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                {/* Export Data */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">📥 Export Your Data</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Download all of your personal data in JSON format (GDPR compliant).
                  </p>
                  <button
                    onClick={handleExportData}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
                  >
                    {actionLoading ? 'Exporting...' : 'Export Data'}
                  </button>
                </div>

                {/* Delete Account */}
                <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <h3 className="font-semibold text-red-800 mb-2">⚠️ Delete Account</h3>
                  <p className="text-red-700 text-sm mb-4">
                    This action is permanent and cannot be undone. All your data will be deleted.
                  </p>
                  
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      Delete My Account
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Enter your password
                        </label>
                        <input
                          type="password"
                          value={deletePassword}
                          onChange={(e) => setDeletePassword(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="Your password"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Type DELETE to confirm
                        </label>
                        <input
                          type="text"
                          value={deleteConfirmation}
                          onChange={(e) => setDeleteConfirmation(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="Type DELETE"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleDeleteAccount}
                          disabled={actionLoading || deleteConfirmation !== 'DELETE'}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                        >
                          {actionLoading ? 'Deleting...' : 'Confirm Delete'}
                        </button>
                        <button
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeletePassword('');
                            setDeleteConfirmation('');
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
