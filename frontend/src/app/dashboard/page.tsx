'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import {
  Users,
  CheckCircle,
  Clock,
  Award,
  TrendingUp,
  Download,
  Plus,
  Radio,
  ShieldAlert,
  ArrowUpRight,
  Sparkles,
  BarChart3,
  Layers,
  ChevronRight,
  ExternalLink,
  BookOpen,
  Bot,
} from 'lucide-react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export default function DashboardPage() {
  const { activeWorkspace } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7D' | '14D' | '30D' | 'ALL'>('30D');
  const [customBot, setCustomBot] = useState<{ connected: boolean; bot?: any } | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [activeWorkspace]);

  const fetchAnalytics = async () => {
    try {
      const res = await api.getAnalyticsOverview();
      setData(res);
      if (activeWorkspace) {
        api.getCustomBot(activeWorkspace._id)
          .then((botRes: any) => setCustomBot(botRes))
          .catch(() => setCustomBot(null));
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const metrics = data?.metrics || {
    totalReferrals: 0,
    verifiedReferrals: 0,
    pendingReferrals: 0,
    conversionRate: '0.0%',
    rewardedCount: 0,
    fraudIncidents: 0,
  };

  const rawChartData = data?.charts?.dailyJoins || [];
  const chartData = rawChartData.length > 0 ? rawChartData : [
    { date: 'Nov 01', total: 0, verified: 0 },
    { date: 'Nov 05', total: 0, verified: 0 },
    { date: 'Nov 10', total: 0, verified: 0 },
    { date: 'Nov 14', total: 0, verified: 0 },
  ];

  const topReferrers = data?.charts?.topReferrers || [];

  // Custom Glassmorphic Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-navy-800/95 border border-navy-650 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs">
          <p className="font-bold text-white mb-1.5">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4 text-electric">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-electric"></span> Total Joins:
              </span>
              <span className="font-bold font-mono">{payload[0]?.value || 0}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-successGreen">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-successGreen"></span> Verified:
              </span>
              <span className="font-bold font-mono">{payload[1]?.value || 0}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-10">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Performance Overview
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Real-time invite attribution, multi-channel verification, and member velocity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/channels"
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all shadow-sm ${
                customBot?.connected && customBot.bot?.bot_username
                  ? 'bg-cyan-50 dark:bg-cyanAccent/10 border-cyan-200 dark:border-cyanAccent/30 text-cyan-800 dark:text-cyanAccent'
                  : 'bg-slate-100 dark:bg-navy-800 border-slate-200 dark:border-navy-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-cyan-600 dark:text-cyanAccent" />
              <span>
                {customBot?.connected && customBot.bot?.bot_username
                  ? `@${customBot.bot.bot_username} (Live)`
                  : 'Central: @TeleGrowthnxbot'}
              </span>
            </Link>

            <a
              href={api.exportCsvUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 hover:border-slate-300 dark:hover:border-navy-650 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export CSV</span>
            </a>

            <Link
              href="/campaigns/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-electric hover:bg-electric-hover text-xs font-bold text-white transition-all shadow-lg shadow-electric/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>New Campaign</span>
            </Link>
          </div>
        </div>

        {/* Quick Tutorial & System Guide Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-navy-800 via-navy-800 to-electric/10 border border-electric/25 p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-electric/15 text-electric border border-electric/30 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">How TeleGrowth Works</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyanAccent/10 text-cyanAccent border border-cyanAccent/20">
                  Interactive Guide
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                New to the platform? Learn how bot invite attribution, anti-fraud hold periods, and automated rewards operate.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-electric/15 hover:bg-electric text-electric hover:text-white border border-electric/30 text-xs font-bold transition shadow-sm"
            >
              <span>Explore Tutorial</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 4 Premium KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Total Referrals */}
          <div className="bg-navy-800/90 border border-navy-700/80 rounded-2xl p-5 shadow-card hover:shadow-card-hover hover:border-electric/30 transition-all duration-200 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-electric/5 rounded-full blur-2xl pointer-events-none group-hover:bg-electric/10 transition-colors"></div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Referrals
              </span>
              <div className="w-9 h-9 rounded-xl bg-electric/10 text-electric border border-electric/20 flex items-center justify-center shadow-sm">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-extrabold text-white tracking-tight">
                  {metrics.totalReferrals.toLocaleString()}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  <span className="text-purple-400 font-semibold">{metrics.premiumReferrals || 0} Premium ⭐</span> • All joins
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-electric/10 text-electric border border-electric/20">
                All time
              </span>
            </div>
          </div>

          {/* Card 2: Verified Referrals */}
          <div className="bg-navy-800/90 border border-navy-700/80 rounded-2xl p-5 shadow-card hover:shadow-card-hover hover:border-successGreen/30 transition-all duration-200 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-successGreen/5 rounded-full blur-2xl pointer-events-none group-hover:bg-successGreen/10 transition-colors"></div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Verified Members
              </span>
              <div className="w-9 h-9 rounded-xl bg-successGreen/10 text-successGreen border border-successGreen/20 flex items-center justify-center shadow-sm">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-extrabold text-successGreen tracking-tight">
                  {metrics.verifiedReferrals.toLocaleString()}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">Passed multi-channel check</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-successGreen/10 text-successGreen border border-successGreen/20 font-mono">
                {metrics.conversionRate} conv.
              </span>
            </div>
          </div>

          {/* Card 3: Pending Verification */}
          <div className="bg-navy-800/90 border border-navy-700/80 rounded-2xl p-5 shadow-card hover:shadow-card-hover hover:border-warningOrange/30 transition-all duration-200 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-warningOrange/5 rounded-full blur-2xl pointer-events-none group-hover:bg-warningOrange/10 transition-colors"></div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Pending Verification
              </span>
              <div className="w-9 h-9 rounded-xl bg-warningOrange/10 text-warningOrange border border-warningOrange/20 flex items-center justify-center shadow-sm">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-extrabold text-warningOrange tracking-tight">
                  {metrics.pendingReferrals.toLocaleString()}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">In retention hold period</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-warningOrange/10 text-warningOrange border border-warningOrange/20">
                Active Audit
              </span>
            </div>
          </div>

          {/* Card 4: Fraud Incidents */}
          <div className="bg-navy-800/90 border border-navy-700/80 rounded-2xl p-5 shadow-card hover:shadow-card-hover hover:border-dangerRed/30 transition-all duration-200 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-dangerRed/5 rounded-full blur-2xl pointer-events-none group-hover:bg-dangerRed/10 transition-colors"></div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Fraud Blocked
              </span>
              <div className="w-9 h-9 rounded-xl bg-dangerRed/10 text-dangerRed border border-dangerRed/20 flex items-center justify-center shadow-sm">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-extrabold text-dangerRed tracking-tight">
                  {metrics.fraudIncidents.toLocaleString()}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">Self-referrals & reversed</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-dangerRed/10 text-dangerRed border border-dangerRed/20">
                Protected
              </span>
            </div>
          </div>
        </div>

        {/* Analytics Chart & Top Referrers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart Card (2 Cols) */}
          <div className="lg:col-span-2 bg-navy-800/90 border border-navy-700/80 rounded-2xl p-6 shadow-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-electric" /> Daily Member Growth & Verification
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tracking members joining through individual Telegram invite links
                </p>
              </div>

              {/* Time Range Pills & Legend */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-navy-900 p-1 rounded-xl border border-navy-700 text-[11px] font-semibold text-slate-400">
                  {(['7D', '14D', '30D', 'ALL'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setTimeRange(r)}
                      className={`px-2.5 py-1 rounded-lg transition-colors ${
                        timeRange === r
                          ? 'bg-electric text-white shadow-sm'
                          : 'hover:text-white'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart Legend */}
            <div className="flex items-center gap-5 text-xs font-semibold pt-1">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-3 h-3 rounded-md bg-electric shadow-sm shadow-electric/50"></span>
                <span>Total Joins</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-3 h-3 rounded-md bg-successGreen shadow-sm shadow-successGreen/50"></span>
                <span>Verified Members</span>
              </div>
            </div>

            {/* Area Chart Container */}
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#18A8F8" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#18A8F8" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="verifiedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22D3A0" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#22D3A0" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#1E293B' }}
                  />
                  <YAxis
                    stroke="#64748B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#18A8F8"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#totalGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="verified"
                    stroke="#22D3A0"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#verifiedGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Referrers Leaderboard (1 Col) */}
          <div className="bg-navy-800/90 border border-navy-700/80 rounded-2xl p-6 shadow-card flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">Top Referrers</h2>
                    <p className="text-[11px] text-slate-400">Viral performance leaders</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-navy-900 px-2 py-1 rounded-md border border-navy-700">
                  Live
                </span>
              </div>

              {topReferrers.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 space-y-3">
                  <div className="w-10 h-10 rounded-full bg-navy-750 flex items-center justify-center mx-auto text-slate-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <p className="text-slate-400 font-medium">No active referrers yet.</p>
                  <p className="text-[11px] text-slate-500">
                    Create a campaign and distribute invite links to start ranking advocates!
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {topReferrers.slice(0, 5).map((r: any, idx: number) => {
                    const rankBadgeColor =
                      idx === 0
                        ? 'bg-amber-400/20 text-amber-300 border-amber-400/40 shadow-sm shadow-amber-400/20'
                        : idx === 1
                        ? 'bg-slate-300/20 text-slate-200 border-slate-300/40'
                        : idx === 2
                        ? 'bg-amber-600/20 text-amber-400 border-amber-600/40'
                        : 'bg-navy-700 text-slate-400 border-navy-600';

                    const conv = r.totalReferred > 0 ? Math.round((r.verifiedCount / r.totalReferred) * 100) : 0;

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl bg-navy-750/60 border border-navy-700/60 hover:border-navy-600 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center border ${rankBadgeColor}`}
                          >
                            #{idx + 1}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>{r.first_name || (r.username ? `@${r.username}` : `ID: ${r._id}`)}</span>
                              {r.is_premium && (
                                <span className="inline-flex items-center text-[9px] font-bold text-purple-400 bg-purple-500/15 border border-purple-500/30 px-1 py-0.2 rounded-full">
                                  ⭐ Premium
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {r.totalReferred} total joined
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-successGreen block">
                            {r.verifiedCount}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {conv}% conv.
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-navy-700/80 text-center">
              <Link
                href="/campaigns"
                className="text-xs text-electric hover:text-electric-light font-semibold inline-flex items-center gap-1 group"
              >
                <span>Manage all campaigns</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Launch & Platform Health Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Link
            href="/channels"
            className="p-5 rounded-2xl bg-navy-800/80 border border-navy-700/80 hover:border-electric/30 hover:bg-navy-750/70 transition-all shadow-card group"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-electric/10 text-electric border border-electric/20 group-hover:scale-105 transition-transform">
                <Radio className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-electric transition-colors" />
            </div>
            <h3 className="text-sm font-bold text-white mt-3 group-hover:text-electric transition-colors">
              Connected Telegram Chats
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Verify admin bot permissions and invite link event access across your channels and groups.
            </p>
          </Link>

          <Link
            href="/rewards"
            className="p-5 rounded-2xl bg-navy-800/80 border border-navy-700/80 hover:border-cyanAccent/30 hover:bg-navy-750/70 transition-all shadow-card group"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-cyanAccent/10 text-cyanAccent border border-cyanAccent/20 group-hover:scale-105 transition-transform">
                <Award className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-cyanAccent transition-colors" />
            </div>
            <h3 className="text-sm font-bold text-white mt-3 group-hover:text-cyanAccent transition-colors">
              Milestone Rewards
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure points, software keys, course passes, and automatic reward delivery ledgers.
            </p>
          </Link>

          <Link
            href="/giveaways"
            className="p-5 rounded-2xl bg-navy-800/80 border border-navy-700/80 hover:border-successGreen/30 hover:bg-navy-750/70 transition-all shadow-card group"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl bg-successGreen/10 text-successGreen border border-successGreen/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-successGreen transition-colors" />
            </div>
            <h3 className="text-sm font-bold text-white mt-3 group-hover:text-successGreen transition-colors">
              Provably-Fair Giveaways
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Run transparent raffle draws with cryptoseed SHA-256 verification and replacement winner support.
            </p>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
