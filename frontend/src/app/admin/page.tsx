"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  UserPlus,
  UserMinus,
  BarChart3,
  Activity,
  Crown,
  Zap
} from "lucide-react";
import { isAdmin, isModerator, apiRequest, getUser } from "../../utils/auth";

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
  const user = getUser();

  useEffect(() => {
    if (!isAdmin() && !isModerator()) {
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
        <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <p className="text-rose-400 mb-4">{error}</p>
          <button
            onClick={() => router.push('/chat')}
            className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
          >
            Go to Chat
          </button>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Users",
      value: stats?.users.total || 0,
      icon: Users,
      color: "from-cyan-500 to-blue-500",
      change: "+12%",
      changeType: "positive"
    },
    {
      label: "Active Users",
      value: stats?.users.active || 0,
      icon: Activity,
      color: "from-emerald-500 to-teal-500",
      change: "+8%",
      changeType: "positive"
    },
    {
      label: "Banned Users",
      value: stats?.users.banned || 0,
      icon: UserMinus,
      color: "from-rose-500 to-pink-500",
      change: "-5%",
      changeType: "negative"
    },
    {
      label: "Pending Reports",
      value: stats?.reports.pending || 0,
      icon: AlertTriangle,
      color: "from-amber-500 to-orange-500",
      change: "+3%",
      changeType: "neutral"
    },
    {
      label: "Verified Users",
      value: stats?.users.verified || 0,
      icon: CheckCircle,
      color: "from-green-500 to-emerald-500",
      change: "+15%",
      changeType: "positive"
    },
    {
      label: "PRO Users",
      value: stats?.users.pro || 0,
      icon: Crown,
      color: "from-amber-400 to-yellow-500",
      change: "+20%",
      changeType: "positive"
    }
  ];

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-slate-400">Welcome back, {user?.name}</p>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass rounded-xl p-4"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-2xl font-bold text-white mb-1">{stat.value.toLocaleString()}</p>
                <p className="text-sm text-slate-400">{stat.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <Link
            href="/admin/users"
            className="glass rounded-xl p-6 hover:bg-slate-800/50 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">User Management</h3>
                <p className="text-sm text-slate-400">Manage all users</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/reports"
            className="glass rounded-xl p-6 hover:bg-slate-800/50 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Reports</h3>
                <p className="text-sm text-slate-400">{stats?.reports.pending || 0} pending</p>
              </div>
            </div>
          </Link>

          <Link
            href="/chat"
            className="glass rounded-xl p-6 hover:bg-slate-800/50 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Live Chat</h3>
                <p className="text-sm text-slate-400">Join the platform</p>
              </div>
            </div>
          </Link>

          <Link
            href="/settings"
            className="glass rounded-xl p-6 hover:bg-slate-800/50 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Settings</h3>
                <p className="text-sm text-slate-400">Account settings</p>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Recent Activity Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-xl p-6"
        >
          <h2 className="text-xl font-bold text-white mb-4">Platform Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-2">
                <UserPlus className="w-8 h-8 text-white" />
              </div>
              <p className="text-2xl font-bold text-white">{stats?.users.recentRegistrations || 0}</p>
              <p className="text-sm text-slate-400">New Users (7 days)</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center mx-auto mb-2">
                <UserMinus className="w-8 h-8 text-white" />
              </div>
              <p className="text-2xl font-bold text-white">{stats?.users.suspended || 0}</p>
              <p className="text-sm text-slate-400">Suspended Users</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-2">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <p className="text-2xl font-bold text-white">{stats?.reports.total || 0}</p>
              <p className="text-sm text-slate-400">Total Reports</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <p className="text-2xl font-bold text-white">
                {stats ? Math.round((stats.users.verified / stats.users.total) * 100) : 0}%
              </p>
              <p className="text-sm text-slate-400">Verification Rate</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
