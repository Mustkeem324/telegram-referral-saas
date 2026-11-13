'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { api } from '../../lib/api';
import Link from 'next/link';
import { Megaphone, Plus, ExternalLink, Play, Pause, Users, Award } from 'lucide-react';

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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Campaigns</h1>
            <p className="text-sm text-slate-400 mt-1">Manage referral drives, multi-channel gates, and giveaway promotions.</p>
          </div>
          <Link
            href="/campaigns/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-white transition-all shadow-lg shadow-sky-500/20"
          >
            <Plus className="w-4 h-4" /> Create Campaign
          </Link>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-500">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto mb-4 border border-sky-500/20">
              <Megaphone className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">No campaigns created yet</h3>
            <p className="text-xs text-slate-400 mt-1 mb-6">
              Launch your first campaign to generate unique invite links for your community members.
            </p>
            <Link
              href="/campaigns/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-white shadow-lg shadow-sky-500/20"
            >
              <Plus className="w-4 h-4" /> Launch Campaign Studio
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((camp) => (
              <div
                key={camp._id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        camp.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {camp.status}
                    </span>
                    <span className="text-xs text-slate-500 uppercase font-semibold">{camp.type}</span>
                  </div>

                  <h3 className="text-base font-semibold text-white truncate">{camp.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {camp.description || 'No description provided.'}
                  </p>

                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-800/80">
                    <div className="bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Joins</span>
                      <span className="text-base font-bold text-white">{camp.total_referrals}</span>
                    </div>
                    <div className="bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Verified</span>
                      <span className="text-base font-bold text-emerald-400">{camp.verified_referrals}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => toggleStatus(camp._id, camp.status)}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-medium"
                  >
                    {camp.status === 'active' ? (
                      <>
                        <Pause className="w-3.5 h-3.5 text-amber-400" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 text-emerald-400" /> Resume
                      </>
                    )}
                  </button>

                  <Link
                    href={`/campaigns/${camp._id}`}
                    className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
                  >
                    Manage Campaign <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
