"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isModerator, apiRequest } from "../../../utils/auth";

interface Report {
  _id: string;
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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function ReportsModerationQueue() {
  const [reports, setReports] = useState<Report[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isModerator()) {
      router.push('/');
      return;
    }
    fetchReports();
  }, [router, pagination.page, statusFilter]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('limit', pagination.limit.toString());
      if (statusFilter) params.set('status', statusFilter);

      const response = await apiRequest(`/admin/reports?${params.toString()}`);
      const data = await response.json();
      
      setReports(data.reports);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (reportId: string, action: 'warn' | 'suspend' | 'ban' | 'dismiss', reason?: string) => {
    setActionLoading(reportId);
    try {
      const response = await apiRequest(`/admin/reports/${reportId}/action`, {
        method: 'POST',
        body: JSON.stringify({ action, reason, duration: 24 }),
      });
      
      if (response.ok) {
        setSelectedReport(null);
        fetchReports();
      }
    } catch (error) {
      console.error('Error performing action:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateStatus = async (reportId: string, status: string, notes?: string) => {
    setActionLoading(reportId);
    try {
      const response = await apiRequest(`/admin/reports/${reportId}`, {
        method: 'PUT',
        body: JSON.stringify({ status, moderatorNotes: notes }),
      });
      
      if (response.ok) {
        fetchReports();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      inappropriate_behavior: '🔞 Inappropriate',
      harassment: '😠 Harassment',
      spam: '📧 Spam',
      underage: '👶 Underage',
      other: '📋 Other',
    };
    return labels[reason] || reason;
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Moderation Queue</h1>
            <p className="text-gray-600">Review and action user reports</p>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 bg-white text-gray-700 rounded-lg shadow hover:bg-gray-50"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex gap-2">
            {['pending', 'investigating', 'resolved', 'dismissed'].map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setPagination(p => ({ ...p, page: 1 }));
                }}
                className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
                  statusFilter === status
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Reports Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Reports</h3>
            <p className="text-gray-600">There are no {statusFilter} reports at this time.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report._id} className="bg-white rounded-xl shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      report.status === 'investigating' ? 'bg-blue-100 text-blue-800' :
                      report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {report.status}
                    </span>
                    <span className="ml-2 text-lg font-semibold">
                      {getReasonLabel(report.reason)}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Reported User</h4>
                    <p className="font-semibold">{report.reportedUser?.name || 'Unknown'}</p>
                    <p className="text-sm text-gray-600">{report.reportedUser?.email || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Reporter</h4>
                    <p className="font-semibold">{report.reporter?.name || 'Unknown'}</p>
                    <p className="text-sm text-gray-600">{report.reporter?.email || 'N/A'}</p>
                  </div>
                </div>

                {report.description && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Description</h4>
                    <p className="text-gray-700 bg-gray-50 rounded-lg p-3">{report.description}</p>
                  </div>
                )}

                {report.moderatorNotes && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Moderator Notes</h4>
                    <p className="text-gray-700 bg-blue-50 rounded-lg p-3">{report.moderatorNotes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
                  {report.status === 'pending' && (
                    <button
                      onClick={() => handleUpdateStatus(report._id, 'investigating')}
                      disabled={actionLoading === report._id}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                    >
                      Start Investigation
                    </button>
                  )}
                  
                  {(report.status === 'pending' || report.status === 'investigating') && (
                    <>
                      <button
                        onClick={() => handleAction(report._id, 'warn', 'Warning from report')}
                        disabled={actionLoading === report._id}
                        className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
                      >
                        ⚠️ Warn User
                      </button>
                      <button
                        onClick={() => handleAction(report._id, 'suspend', 'Suspended from report')}
                        disabled={actionLoading === report._id}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                      >
                        ⏸️ Suspend (24h)
                      </button>
                      <button
                        onClick={() => handleAction(report._id, 'ban', 'Banned from report')}
                        disabled={actionLoading === report._id}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                      >
                        🚫 Ban User
                      </button>
                      <button
                        onClick={() => handleAction(report._id, 'dismiss')}
                        disabled={actionLoading === report._id}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
                      >
                        ❌ Dismiss
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {reports.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} reports
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page <= 1}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page >= pagination.pages}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
