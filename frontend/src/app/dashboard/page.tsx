'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { api } from '../../lib/api';
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
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await api.getAnalyticsOverview();
      setData(res);
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

  const chartData = data?.charts?.dailyJoins || [
    { date: 'Nov 01', total: 0, verified: 0 },
    { date: 'Nov 05', total: 0, verified: 0 },
    { date: 'Nov 10', total: 0, verified: 0 },
    { date: 'Nov 13', total: 0, verified: 0 },
  ];

  const topReferrers = data?.charts?.topReferrers || [];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Top welcome & quick actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Campaign Performance Overview</h1>
            <p className="text-sm text-slate-400 mt-1">Real-time invite attribution, membership verification, and viral metrics.</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={api.exportCsvUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700/80 transition-all"
            >
              <Download className="w-4 h-4" /> Export CSV
            </a>
            <Link
              href="/campaigns/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-white transition-all shadow-lg shadow-sky-500/20"
            >
              <Plus className="w-4 h-4" /> New Campaign
            </Link>
          </div>
        </div>

        {/* 4 Key Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Referrals</span>
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{metrics.totalReferrals}</span>
              <span className="text-xs font-medium text-slate-400">clicks & joins</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Verified Referrals</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-400">{metrics.verifiedReferrals}</span>
              <span className="text-xs font-medium text-emerald-500/80">({metrics.conversionRate} conv.)</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending Verification</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-400">{metrics.pendingReferrals}</span>
              <span className="text-xs font-medium text-slate-400">in retention hold</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Fraud Incidents</span>
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-rose-400">{metrics.fraudIncidents}</span>
              <span className="text-xs font-medium text-slate-400">auto-blocked</span>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Joins Line Chart */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-sm font-semibold text-white">Daily Member Growth & Verification</h2>
                <p className="text-xs text-slate-400">Tracking members joining through individual Telegram invite links</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5 text-sky-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span> Total Joins
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Verified
                </div>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="verifiedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#totalGradient)" />
                  <Area type="monotone" dataKey="verified" stroke="#34d399" strokeWidth={2} fillOpacity={1} fill="url(#verifiedGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Referrers */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white">Top Referrers</h2>
                <Award className="w-4 h-4 text-amber-400" />
              </div>

              {topReferrers.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No active referrers yet. Share your campaign link to get started!
                </div>
              ) : (
                <div className="space-y-3">
                  {topReferrers.slice(0, 5).map((r: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-md bg-slate-700 text-sky-400 font-bold text-xs flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <div>
                          <span className="text-xs font-semibold text-white block">ID: {r._id}</span>
                          <span className="text-[10px] text-slate-400">{r.totalReferred} total joined</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-400 block">{r.verifiedCount}</span>
                        <span className="text-[10px] text-slate-500">verified</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-center">
              <Link href="/campaigns" className="text-xs text-sky-400 hover:text-sky-300 font-medium">
                View all campaign leaderboards →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
