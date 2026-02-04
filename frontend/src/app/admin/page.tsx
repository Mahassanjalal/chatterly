"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser, isAdmin, apiRequest } from "../../utils/auth";

interface DashboardStats {
  users: {
    total: number;
    active: number;
    banned: number;
    suspended: number;
    verified: number;
    pro: number;
    recentRegistrations: number;
  };
  reports: {
    total: number;
    pending: number;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Check if user is admin
    if (!isAdmin()) {
      router.push('/');
      return;
    }

    const fetchStats = async () => {
      try {
        const response = await apiRequest('/admin/dashboard');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard stats');
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => router.push('/chat')}
            className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            Go to Chat
          </button>
        </div>
      </div>
    );
  }

  const user = getUser();

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.name}</p>
          </div>
          <Link
            href="/chat"
            className="px-4 py-2 bg-white text-gray-700 rounded-lg shadow hover:bg-gray-50"
          >
            ← Back to App
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Users"
            value={stats?.users.total || 0}
            icon="👥"
            color="bg-blue-500"
          />
          <StatCard
            title="Active Users"
            value={stats?.users.active || 0}
            icon="✅"
            color="bg-green-500"
          />
          <StatCard
            title="Pending Reports"
            value={stats?.reports.pending || 0}
            icon="⚠️"
            color="bg-yellow-500"
          />
          <StatCard
            title="New Users (7d)"
            value={stats?.users.recentRegistrations || 0}
            icon="📈"
            color="bg-purple-500"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">User Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Verified</span>
                <span className="font-semibold text-green-600">{stats?.users.verified || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pro Users</span>
                <span className="font-semibold text-purple-600">{stats?.users.pro || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Suspended</span>
                <span className="font-semibold text-yellow-600">{stats?.users.suspended || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Banned</span>
                <span className="font-semibold text-red-600">{stats?.users.banned || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Reports</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Reports</span>
                <span className="font-semibold">{stats?.reports.total || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pending Review</span>
                <span className="font-semibold text-yellow-600">{stats?.reports.pending || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                href="/admin/users"
                className="block w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                👥 Manage Users
              </Link>
              <Link
                href="/admin/reports"
                className="block w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ⚠️ Review Reports
              </Link>
            </div>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/admin/users" className="block">
            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                  👥
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">User Management</h3>
                  <p className="text-gray-600">View, search, and manage all users</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/admin/reports" className="block">
            <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-2xl">
                  ⚠️
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Moderation Queue</h3>
                  <p className="text-gray-600">Review and action user reports</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
        </div>
        <div className={`w-12 h-12 ${color} rounded-full flex items-center justify-center text-2xl text-white`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
