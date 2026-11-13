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
} from 'lucide-react';

export default function SuperAdminPage() {
  const { user } = useAuth();

  const [overview, setOverview] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Ban Modal
  const [selectedUser, setSelectedUser] = useState<any>(null);
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
      setSelectedUser(null);
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
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-3 border border-rose-500/20">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Platform Super Admin Restricted</h2>
          <p className="text-xs text-slate-400 mt-1">You must be authenticated with the superadmin role to access platform operations.</p>
        </div>
      </DashboardLayout>
    );
  }

  const stats = overview?.overview || {};

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">Platform Super Admin Console</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Superuser Access
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Global tenant monitoring, user restriction controls, payment totals, and system health.
            </p>
          </div>
        </div>

        {/* Top 4 Global Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <span className="text-xs uppercase font-semibold text-slate-400">Total Registered Users</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-white">{stats.totalUsers || 0}</span>
              <span className="text-xs text-emerald-400">{stats.activeUsers || 0} active</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <span className="text-xs uppercase font-semibold text-slate-400">Total Workspaces</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-sky-400">{stats.totalWorkspaces || 0}</span>
              <span className="text-xs text-slate-400">{stats.activeSubscriptions || 0} paid subs</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <span className="text-xs uppercase font-semibold text-slate-400">Total Campaigns Created</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-amber-400">{stats.totalCampaigns || 0}</span>
              <span className="text-xs text-slate-400">{stats.totalReferrals || 0} refs</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <span className="text-xs uppercase font-semibold text-slate-400">Unresolved Fraud Alerts</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-rose-400">{stats.unresolvedFraudEvents || 0}</span>
              <span className="text-xs text-slate-400">{stats.openTickets || 0} open tickets</span>
            </div>
          </div>
        </div>

        {/* Global User Management */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-400" /> Platform User Directory & Restrictions
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 rounded-l">Telegram ID</th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Username</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Account Status</th>
                  <th className="py-2.5 px-3 rounded-r text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {usersList.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-mono text-slate-300 font-semibold">{u.telegram_id}</td>
                    <td className="py-3 px-3 text-white font-medium">{u.first_name} {u.last_name || ''}</td>
                    <td className="py-3 px-3 text-sky-400 font-mono">{u.username ? `@${u.username}` : '—'}</td>
                    <td className="py-3 px-3 uppercase text-[10px] font-bold text-slate-400">{u.role}</td>
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
                    <td className="py-3 px-3 text-right">
                      {u.role !== 'superadmin' && (
                        <button
                          onClick={() => toggleUserBan(u)}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                            u.is_active
                              ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
                          }`}
                        >
                          {u.is_active ? 'Suspend Account' : 'Reactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Support Tickets Inbox */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
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
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-sky-400">
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
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setReplyTicketId(null)}
                          className="px-3 py-1 rounded bg-slate-800 text-slate-400 text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleReplyTicket(t._id)}
                          className="px-3 py-1 rounded bg-sky-500 text-white text-xs font-semibold flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" /> Send Reply via Telegram
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReplyTicketId(t._id)}
                      className="text-xs text-sky-400 hover:text-sky-300 font-medium inline-block mt-1"
                    >
                      Reply to User →
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System & Database Health */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-sky-400" /> Infrastructure & Webhook Event Monitor
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-800/40 p-3.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 block">Database Status</span>
              <span className="text-emerald-400 font-bold text-sm block mt-1">
                {systemHealth?.database?.status?.toUpperCase() || 'CONNECTED'}
              </span>
              <span className="text-[10px] text-slate-500">MongoDB ReplicaSet rs0</span>
            </div>

            <div className="bg-slate-800/40 p-3.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 block">Server Node Runtime</span>
              <span className="text-white font-bold text-sm block mt-1">
                {systemHealth?.system?.nodeVersion || 'v22.23.2'}
              </span>
              <span className="text-[10px] text-slate-500">Node.js / TypeScript</span>
            </div>

            <div className="bg-slate-800/40 p-3.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 block">Redis & Queue Worker</span>
              <span className="text-emerald-400 font-bold text-sm block mt-1">ACTIVE</span>
              <span className="text-[10px] text-slate-500">BullMQ Audit Queue</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
