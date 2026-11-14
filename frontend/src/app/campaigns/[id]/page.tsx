'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { DashboardLayout } from '../../../components/DashboardLayout';
import { api } from '../../../lib/api';
import {
  Megaphone,
  Copy,
  Check,
  Users,
  Award,
  Radio,
  ExternalLink,
  ShieldAlert,
  ArrowLeft,
  Sparkles,
  Trophy,
  Activity,
  Layers,
  Clock,
  Coins,
} from 'lucide-react';
import Link from 'next/link';

export default function CampaignDetailPage() {
  const { id } = useParams() as { id: string };

  const [campaign, setCampaign] = useState<any>(null);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [myInviteLink, setMyInviteLink] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadAll();
    }
  }, [id]);

  const loadAll = async () => {
    try {
      const [campData, refData, leadData] = await Promise.all([
        api.getCampaign(id),
        api.getCampaignReferrals(id, 1, 'all'),
        api.getLeaderboard(id),
      ]);

      setCampaign(campData.campaign);
      setRequirements(campData.requirements || []);
      setRewards(campData.rewards || []);
      setReferrals(refData.data || []);
      setLeaderboard(leadData || []);

      // Generate user's referral link
      api.getReferralLink(id)
        .then((res) => setMyInviteLink(res.invite_link))
        .catch(console.error);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (myInviteLink) {
      navigator.clipboard.writeText(myInviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="py-24 text-center">
          <div className="w-10 h-10 border-2 border-electric border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm font-medium">Loading campaign details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!campaign) {
    return (
      <DashboardLayout>
        <div className="py-24 text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-dangerRed/10 border border-dangerRed/20 text-dangerRed flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Campaign Not Found</h2>
          <p className="text-slate-400 text-xs mb-6">This campaign does not exist or you do not have permission to view it.</p>
          <Link
            href="/campaigns"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-navy-800 border border-slate-700 text-white text-xs font-semibold hover:border-slate-600 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Campaigns
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/campaigns"
              className="p-2.5 rounded-xl bg-navy-800 border border-slate-800/80 text-slate-400 hover:text-white hover:border-slate-700 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-white tracking-tight">{campaign.title}</h1>
                <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${
                  campaign.status === 'active'
                    ? 'bg-successGreen/10 text-successGreen border-successGreen/25'
                    : 'bg-warningOrange/10 text-warningOrange border-warningOrange/25'
                }`}>
                  {campaign.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{campaign.description || 'Campaign Overview & Real-Time Member Attribution'}</p>
            </div>
          </div>
        </div>

        {/* Invite link card */}
        <div className="relative overflow-hidden rounded-2xl border border-electric/30 bg-gradient-to-r from-navy-800 via-navy-800/90 to-electric/5 p-6 shadow-card">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-electric" />
                <span className="text-xs font-bold text-electric uppercase tracking-wider">
                  Attributed Telegram Invite Link
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                Generated via native Telegram Bot API with cryptographic attribution. Every member joining via this link is automatically verified and rewarded.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <input
                type="text"
                readOnly
                value={myInviteLink || 'Generating unique link...'}
                className="bg-navy-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-cyanAccent font-mono flex-1 lg:w-80 select-all focus:outline-none focus:border-electric transition"
              />
              <button
                onClick={copyToClipboard}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-electric hover:bg-electric/90 text-xs font-semibold text-white transition-all shadow-md active:scale-95"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-navy-800 border border-slate-800/80 rounded-2xl p-4 shadow-card hover:border-slate-700/80 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Joins</span>
              <Users className="w-4 h-4 text-slate-500" />
            </div>
            <span className="text-2xl font-bold text-white mt-2 block tracking-tight">{campaign.total_referrals}</span>
          </div>
          <div className="bg-navy-800 border border-slate-800/80 rounded-2xl p-4 shadow-card hover:border-slate-700/80 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Verified Joins</span>
              <div className="w-2 h-2 rounded-full bg-successGreen" />
            </div>
            <span className="text-2xl font-bold text-successGreen mt-2 block tracking-tight">{campaign.verified_referrals}</span>
          </div>
          <div className="bg-navy-800 border border-slate-800/80 rounded-2xl p-4 shadow-card hover:border-slate-700/80 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Points / Referral</span>
              <Coins className="w-4 h-4 text-electric" />
            </div>
            <span className="text-2xl font-bold text-electric mt-2 block tracking-tight">{campaign.reward_policy?.points_per_referral || 10}</span>
          </div>
          <div className="bg-navy-800 border border-slate-800/80 rounded-2xl p-4 shadow-card hover:border-slate-700/80 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Retention Hold</span>
              <Clock className="w-4 h-4 text-warningOrange" />
            </div>
            <span className="text-2xl font-bold text-slate-200 mt-2 block tracking-tight">{campaign.reward_policy?.retention_period_days || 0}d</span>
          </div>
        </div>

        {/* Leaderboard and Referrals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Referrals Stream */}
          <div className="lg:col-span-2 bg-navy-800 border border-slate-800/80 rounded-2xl p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-electric" /> Recent Referral Attributions
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">Real-time ledger</span>
            </div>

            {referrals.length === 0 ? (
              <div className="py-14 text-center text-xs text-slate-500">
                No referral attributions recorded yet. Share your invite link to begin!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-navy-900/60 text-slate-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-3.5 rounded-l-xl font-bold">Referred User</th>
                      <th className="py-3 px-3.5 font-bold">Referrer</th>
                      <th className="py-3 px-3.5 font-bold">Status</th>
                      <th className="py-3 px-3.5 font-bold">Points</th>
                      <th className="py-3 px-3.5 rounded-r-xl font-bold">Joined At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {referrals.map((ref) => (
                      <tr key={ref._id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-3.5 font-mono text-slate-300">{ref.referred_telegram_id}</td>
                        <td className="py-3 px-3.5 font-mono text-electric">{ref.referrer_telegram_id}</td>
                        <td className="py-3 px-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              ref.status === 'rewarded' || ref.status === 'verified'
                                ? 'bg-successGreen/10 text-successGreen border-successGreen/25'
                                : ref.status === 'rejected' || ref.status === 'reversed'
                                ? 'bg-dangerRed/10 text-dangerRed border-dangerRed/25'
                                : 'bg-warningOrange/10 text-warningOrange border-warningOrange/25'
                            }`}
                          >
                            {ref.status}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 font-semibold text-white">+{ref.points_awarded || 0}</td>
                        <td className="py-3 px-3.5 text-slate-500 text-[11px]">
                          {new Date(ref.joined_at || ref.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <div className="bg-navy-800 border border-slate-800/80 rounded-2xl p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-warningOrange" /> Top Referrers
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">Rankings</span>
            </div>

            {leaderboard.length === 0 ? (
              <div className="py-14 text-center text-xs text-slate-500">No leaderboard entries yet.</div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((user, idx) => {
                  const isGold = idx === 0;
                  const isSilver = idx === 1;
                  const isBronze = idx === 2;

                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isGold
                          ? 'bg-amber-500/5 border-amber-500/30'
                          : isSilver
                          ? 'bg-slate-300/5 border-slate-300/30'
                          : isBronze
                          ? 'bg-amber-700/5 border-amber-700/30'
                          : 'bg-navy-900/40 border-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-lg font-bold text-[10px] flex items-center justify-center ${
                            isGold
                              ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/50'
                              : isSilver
                              ? 'bg-slate-300 text-slate-950'
                              : isBronze
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <div>
                          <span className="text-xs font-semibold text-white block">{user.first_name || 'Member'}</span>
                          <span className="text-[10px] text-slate-500 font-mono">ID: {user.user_telegram_id}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-successGreen block">{user.verified_count}</span>
                        <span className="text-[10px] text-slate-500">verified</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
