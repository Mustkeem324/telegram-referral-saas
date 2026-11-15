'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import {
  ShieldCheck,
  Users,
  DollarSign,
  Activity,
  AlertCircle,
  Database,
  Lock,
  UserX,
  UserCheck,
  MessageSquare,
  Send,
  Shield,
  KeyRound,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react';

export default function SuperAdminPage() {
  const { user } = useAuth();

  const [overview, setOverview] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Ban Action
  const [banReason, setBanReason] = useState('Abuse of platform terms');

  // Support reply
  const [replyTicketId, setReplyTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (user?.role === 'superadmin') {
      loadAdminData();
    }
  }, [user]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [ov, usrs, hlt, tix] = await Promise.all([
        api.getAdminOverview(),
        api.getAdminUsers(1),
        api.getAdminHealth(),
        api.getAdminTickets(),
      ]);
      setOverview(ov);
      setUsersList(usrs.data || []);
      setSystemHealth(hlt);
      setTickets(tix || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserBan = async (targetUser: any) => {
    try {
      await api.setAdminUserStatus(targetUser._id, !targetUser.is_active, banReason);
      await loadAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleUserRole = async (targetUser: any) => {
    try {
      const nextRole = targetUser.role === 'superadmin' ? 'user' : 'superadmin';
      await api.setAdminUserRole(targetUser._id, nextRole);
      await loadAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReplyTicket = async (ticketId: string) => {
    if (!replyText) return;
    try {
      await api.replyAdminTicket(ticketId, replyText, 'resolved');
      setReplyText('');
      setReplyTicketId(null);
      await loadAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  if (user?.role !== 'superadmin') {
    return (
      <DashboardLayout>
        <div className="py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/20 shadow-lg shadow-rose-500/10">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white">Platform Super Admin Restricted</h2>
          <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
            This console is restricted to the Platform Owner and authorized administrators. Authenticate with an approved Telegram ID to access.
          </p>
          <div className="mt-6">
            <a
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
            >
              Return to Dashboard
            </a>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const stats = overview?.overview || {};

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-white tracking-tight">Platform Administration Console</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 shadow-sm shadow-amber-500/10">
                <Shield className="w-3 h-3 text-amber-400" /> Superuser
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Global tenant management, user permissions, fraud intervention, and system health.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAdminData}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all"
            >
              Refresh Data
            </button>
          </div>
        </div>

        {/* How Admin Access Works Info Banner */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/20 border border-amber-500/20 shadow-xl relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div className="space-y-1 text-xs">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                How Platform Admin Access Works
              </h3>
              <p className="text-slate-300 leading-relaxed">
                Superadmin access is bound directly to verified Telegram accounts. Your account (Telegram ID: <span className="font-mono text-amber-300 font-bold">{user?.telegram_id}</span>) is recognized as the platform owner.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-2 bg-slate-800/60 p-2 rounded-lg border border-slate-700/60">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Automatic Telegram ID authentication</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-800/60 p-2 rounded-lg border border-slate-700/60">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Global bypass to all tenant workspaces</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-800/60 p-2 rounded-lg border border-slate-700/60">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>1-click user promotion & ban controls</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top 4 Global Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <span className="text-xs uppercase font-semibold text-slate-400">Total Registered Users</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-white">{stats.totalUsers || 0}</span>
              <span className="text-xs font-semibold text-emerald-400">{stats.activeUsers || 0} active</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <span className="text-xs uppercase font-semibold text-slate-400">Total Workspaces</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-sky-400">{stats.totalWorkspaces || 0}</span>
              <span className="text-xs text-slate-400">{stats.activeSubscriptions || 0} active plans</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <span className="text-xs uppercase font-semibold text-slate-400">Total Campaigns</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-amber-400">{stats.totalCampaigns || 0}</span>
              <span className="text-xs text-slate-400">{stats.totalReferrals || 0} referrals</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <span className="text-xs uppercase font-semibold text-slate-400">Unresolved Fraud Alerts</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-rose-400">{stats.unresolvedFraudEvents || 0}</span>
              <span className="text-xs text-slate-400">{stats.openTickets || 0} open tickets</span>
            </div>
          </div>
        </div>

        {/* Global User Management & Role Promotion */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" /> Platform User Directory & Permission Controls
            </h2>
            <span className="text-xs text-slate-400">{usersList.length} users listed</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 rounded-l">Telegram ID</th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Username</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 rounded-r text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {usersList.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-300 font-semibold">{u.telegram_id}</td>
                    <td className="py-3 px-3 text-white font-medium">
                      {u.first_name} {u.last_name || ''}
                    </td>
                    <td className="py-3 px-3 text-sky-400 font-mono">{u.username ? `@${u.username}` : '—'}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.role === 'superadmin'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      {/* Role Toggle */}
                      {u.telegram_id !== user?.telegram_id && (
                        <button
                          onClick={() => toggleUserRole(u)}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors border ${
                            u.role === 'superadmin'
                              ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                              : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                          }`}
                        >
                          {u.role === 'superadmin' ? 'Demote to User' : 'Make Admin'}
                        </button>
                      )}

                      {/* Ban / Unban Toggle */}
                      {u.role !== 'superadmin' && (
                        <button
                          onClick={() => toggleUserBan(u)}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors border ${
                            u.is_active
                              ? 'bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border-rose-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border-emerald-500/30'
                          }`}
                        >
                          {u.is_active ? 'Suspend' : 'Reactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
            <span className="text-xs uppercase font-semibold text-slate-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-400" /> MongoDB Replica Set
            </span>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-sm font-bold text-white">
                {systemHealth?.database?.status === 'connected' ? 'Connected (ACID Active)' : 'Healthy'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Replica Set rs0 with MongoDB transactions enabled</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
            <span className="text-xs uppercase font-semibold text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-sky-400" /> Background Queues
            </span>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse"></span>
              <span className="text-sm font-bold text-white">BullMQ Worker Live</span>
            </div>
            <p className="text-[11px] text-slate-500">Retention audits & reward distribution processing</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
            <span className="text-xs uppercase font-semibold text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" /> Telegram Central Bot
            </span>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-sm font-bold text-white">@TeleGrowthnxbot Live</span>
            </div>
            <p className="text-[11px] text-slate-500">Long-polling active for chat joins & auth clicks</p>
          </div>
        </div>

        {/* Support Tickets Inbox */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-sm">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-400" /> Support Inquiries ({tickets.length})
          </h2>

          {tickets.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No support tickets currently pending.</div>
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <div key={t._id} className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">{t.subject}</span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-sky-400 border border-slate-700">
                      {t.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    From Telegram User: <code className="text-sky-300">{t.user_telegram_id}</code> • Category: {t.category}
                  </p>

                  {replyTicketId === t._id ? (
                    <div className="mt-3 space-y-2">
                      <textarea
                        rows={2}
                        placeholder="Write support response..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setReplyTicketId(null)}
                          className="px-3 py-1 rounded bg-slate-800 text-slate-400 text-xs hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleReplyTicket(t._id)}
                          className="px-3 py-1 rounded bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold"
                        >
                          Send Response
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => setReplyTicketId(t._id)}
                        className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
                      >
                        Reply to User <Send className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
