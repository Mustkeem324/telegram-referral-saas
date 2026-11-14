'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { api } from '../../lib/api';
import Link from 'next/link';
import {
  Megaphone,
  Plus,
  ExternalLink,
  Play,
  Pause,
  Users,
  Award,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Layers,
  Copy,
  Check,
} from 'lucide-react';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const data = await api.getCampaigns();
      setCampaigns(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      await api.updateCampaignStatus(id, nextStatus);
      await loadCampaigns();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-10">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <span>Campaigns</span>
              <span className="text-xs font-bold text-electric bg-electric/10 px-2 py-0.5 rounded-full border border-electric/20 font-mono">
                {campaigns.length} Total
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Manage viral referral drives, multi-channel gates, and giveaway promotions.
            </p>
          </div>

          <Link
            href="/campaigns/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-electric hover:bg-electric-hover text-xs font-bold text-white transition-all shadow-lg shadow-electric/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Create Campaign</span>
          </Link>
        </div>

        {loading ? (
          <div className="py-24 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-electric border-t-transparent rounded-full animate-spin"></div>
            <span>Loading Campaigns...</span>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-navy-800/80 border border-navy-700/80 rounded-2xl p-12 text-center max-w-xl mx-auto shadow-card">
            <div className="w-14 h-14 rounded-2xl bg-electric/10 text-electric flex items-center justify-center mx-auto mb-4 border border-electric/25 shadow-lg shadow-electric/15">
              <Megaphone className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">No campaigns created yet</h3>
            <p className="text-xs text-slate-400 mt-1.5 mb-6 max-w-sm mx-auto leading-relaxed">
              Launch your first campaign to generate unique invite links for each participant and track Telegram member joins automatically.
            </p>
            <Link
              href="/campaigns/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-electric hover:bg-electric-hover text-xs font-bold text-white shadow-lg shadow-electric/20 hover:scale-105 transition-all"
            >
              <Plus className="w-4 h-4" /> Launch Campaign Studio
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((camp) => {
              const conversion =
                camp.total_referrals > 0
                  ? Math.round((camp.verified_referrals / camp.total_referrals) * 100)
                  : 0;

              return (
                <div
                  key={camp._id}
                  className="bg-navy-800/90 border border-navy-700/80 hover:border-navy-650 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          camp.status === 'active'
                            ? 'bg-successGreen/15 text-successGreen border border-successGreen/30'
                            : 'bg-warningOrange/15 text-warningOrange border border-warningOrange/30'
                        }`}
                      >
                        {camp.status}
                      </span>
                      <span className="text-[10px] text-cyanAccent font-bold uppercase tracking-wider bg-cyanAccent/10 px-2 py-0.5 rounded-md border border-cyanAccent/20">
                        {camp.type}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white group-hover:text-electric transition-colors truncate">
                      {camp.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {camp.description || 'No description provided.'}
                    </p>

                    <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-navy-700/80">
                      <div className="bg-navy-750/70 p-3 rounded-xl border border-navy-700/60">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Total Joins
                        </span>
                        <span className="text-lg font-extrabold text-white mt-0.5 block">
                          {camp.total_referrals.toLocaleString()}
                        </span>
                      </div>
                      <div className="bg-navy-750/70 p-3 rounded-xl border border-navy-700/60">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Verified
                        </span>
                        <div className="flex items-baseline justify-between mt-0.5">
                          <span className="text-lg font-extrabold text-successGreen">
                            {camp.verified_referrals.toLocaleString()}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {conversion}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-navy-700/80 flex items-center justify-between text-xs">
                    <button
                      onClick={() => toggleStatus(camp._id, camp.status)}
                      className="text-slate-400 hover:text-white flex items-center gap-1.5 font-medium transition-colors"
                    >
                      {camp.status === 'active' ? (
                        <>
                          <Pause className="w-3.5 h-3.5 text-warningOrange" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 text-successGreen" />
                          <span>Resume</span>
                        </>
                      )}
                    </button>

                    <Link
                      href={`/campaigns/${camp._id}`}
                      className="text-electric hover:text-electric-light font-bold flex items-center gap-1 group/btn"
                    >
                      <span>Manage</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
