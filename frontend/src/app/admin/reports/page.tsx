"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Ban,
  UserMinus,
  Eye,
  XCircle,
  MessageSquare
} from "lucide-react";
import { isAdmin, isModerator, apiRequest } from "../../../utils/auth";

interface Report {
  id: string;
  reportedUserId: string;
  reporterUserId: string;
  reason: string;
  description?: string;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  moderatorNotes?: string;
  createdAt: string;
  resolvedAt?: string;
  reportedUser?: {
    name: string;
    email: string;
  };
  reporter?: {
    name: string;
    email: string;
  };
}

interface ReportsResponse {
  reports: Report[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReports, setTotalReports] = useState(0);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionType, setActionType] = useState<'warn' | 'suspend' | 'ban' | 'dismiss' | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isAdmin() && !isModerator()) {
      router.push('/');
      return;
    }
    fetchReports();
  }, [router, currentPage, statusFilter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await apiRequest(`/admin/reports?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }
      const data: ReportsResponse = await response.json();
      setReports(data.reports);
      setTotalPages(data.pagination.pages);
      setTotalReports(data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (reportId: string, action: 'warn' | 'suspend' | 'ban' | 'dismiss', reason?: string) => {
    setActionLoading(true);
    try {
      const response = await apiRequest(`/admin/reports/${reportId}/action`, {
        method: 'POST',
        body: JSON.stringify({ action, reason }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} report`);
      }

      fetchReports();
      setSelectedReport(null);
      setActionType(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to take action`);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs"><Clock className="w-3 h-3" /> Pending</span>;
      case 'investigating':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs"><Eye className="w-3 h-3" /> Investigating</span>;
      case 'resolved':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs"><CheckCircle className="w-3 h-3" /> Resolved</span>;
      case 'dismissed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-500/20 text-slate-400 rounded-full text-xs"><XCircle className="w-3 h-3" /> Dismissed</span>;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-white mb-2">Reports & Moderation</h1>
          <p className="text-slate-400">{totalReports.toLocaleString()} total reports</p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-xl p-4 mb-6"
        >
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex gap-2">
              {['pending', 'investigating', 'resolved', 'dismissed', 'all'].map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setStatusFilter(status);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg transition-all capitalize ${
                    statusFilter === status
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
            <button
              onClick={fetchReports}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </motion.div>

        {/* Reports List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {loading ? (
            <div className="glass rounded-xl p-8 text-center">
              <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : error ? (
            <div className="glass rounded-xl p-8 text-center">
              <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
              <p className="text-rose-400">{error}</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center">
              <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No reports found</p>
            </div>
          ) : (
            reports.map((report, index) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass rounded-xl p-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm text-slate-400">Report #{report.id.slice(-6)}</span>
                      {getStatusBadge(report.status)}
                      <span className="text-xs text-slate-500">{formatDate(report.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                          {report.reportedUser?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-white font-medium">{report.reportedUser?.name || 'Unknown User'}</p>
                          <p className="text-xs text-slate-400">Reported by {report.reporter?.name || 'Unknown'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <p className="text-sm font-medium text-rose-400 mb-1">{report.reason}</p>
                      {report.description && (
                        <p className="text-sm text-slate-300">{report.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedReport(report)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Review
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-4 mt-6"
          >
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <span className="text-slate-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </motion.div>
        )}

        {/* Action Modal */}
        <AnimatePresence>
          {selectedReport && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => {
                setSelectedReport(null);
                setActionType(null);
              }}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="glass rounded-2xl p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold text-white mb-4">Review Report</h3>

                <div className="space-y-4 mb-6">
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-sm text-slate-400 mb-1">Reported User</p>
                    <p className="text-white font-medium">{selectedReport.reportedUser?.name}</p>
                    <p className="text-sm text-slate-400">{selectedReport.reportedUser?.email}</p>
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-sm text-slate-400 mb-1">Reason</p>
                    <p className="text-rose-400 font-medium">{selectedReport.reason}</p>
                    {selectedReport.description && (
                      <p className="text-slate-300 mt-2">{selectedReport.description}</p>
                    )}
                  </div>
                </div>

                {!actionType ? (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-400">Take action against this user:</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setActionType('warn')}
                        disabled={selectedReport.reportedUser?.name === 'Admin'}
                        className="px-4 py-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors"
                      >
                        <AlertTriangle className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-sm">Warn</span>
                      </button>
                      <button
                        onClick={() => setActionType('suspend')}
                        disabled={selectedReport.reportedUser?.name === 'Admin'}
                        className="px-4 py-3 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg transition-colors"
                      >
                        <Clock className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-sm">Suspend</span>
                      </button>
                      <button
                        onClick={() => setActionType('ban')}
                        disabled={selectedReport.reportedUser?.name === 'Admin'}
                        className="px-4 py-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg transition-colors"
                      >
                        <Ban className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-sm">Ban</span>
                      </button>
                      <button
                        onClick={() => handleAction(selectedReport.id, 'dismiss')}
                        className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                      >
                        <XCircle className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-sm">Dismiss</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-400">
                      {actionType === 'warn' && 'Send a warning to this user'}
                      {actionType === 'suspend' && 'Suspend this user'}
                      {actionType === 'ban' && 'Permanently ban this user'}
                    </p>
                    <textarea
                      placeholder="Add notes (optional)..."
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                      rows={3}
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => setActionType(null)}
                        className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => handleAction(selectedReport.id, actionType)}
                        disabled={actionLoading}
                        className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {actionLoading ? 'Processing...' : 'Confirm'}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
