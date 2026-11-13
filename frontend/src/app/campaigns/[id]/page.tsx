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
        <div className="py-20 text-center text-slate-500">Loading campaign details...</div>
      </DashboardLayout>
    );
  }

  if (!campaign) {
    return (
      <DashboardLayout>
        <div className="py-20 text-center text-rose-400">Campaign not found.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/campaigns"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">{campaign.title}</h1>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                campaign.status === 'active'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {campaign.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{campaign.description || 'Campaign Overview & Attribution Stream'}</p>
          </div>
        </div>

        {/* Invite link card */}
        <div className="bg-gradient-to-r from-sky-950/40 via-slate-900 to-slate-900 border border-sky-500/30 rounded-xl p-5 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider block">
                Your Individual Chat Invite Link
              </span>
              <p className="text-xs text-slate-400 mt-1">
                Generated via Telegram <code className="text-sky-300">createChatInviteLink</code>. Every member joining via this link is attributed to your account.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={myInviteLink || 'Generating unique link...'}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-sky-300 font-mono w-64 select-all"
              />
              <button
                onClick={copyToClipboard}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-white transition-all shadow-md"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-[10px] font-semibold uppercase text-slate-400 block">Total Joins</span>
            <span className="text-xl font-bold text-white mt-1 block">{campaign.total_referrals}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-[10px] font-semibold uppercase text-slate-400 block">Verified Joins</span>
            <span className="text-xl font-bold text-emerald-400 mt-1 block">{campaign.verified_referrals}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-[10px] font-semibold uppercase text-slate-400 block">Points / Referral</span>
            <span className="text-xl font-bold text-sky-400 mt-1 block">{campaign.reward_policy?.points_per_referral || 10}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-[10px] font-semibold uppercase text-slate-400 block">Retention Hold</span>
            <span className="text-xl font-bold text-slate-300 mt-1 block">{campaign.reward_policy?.retention_period_days || 0} days</span>
          </div>
        </div>

        {/* Leaderboard and Referrals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Referrals Stream */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" /> Recent Referral Attributions
            </h2>

            {referrals.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No referral attributions recorded yet. Share your invite link to begin!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3 rounded-l">Referred User</th>
                      <th className="py-2.5 px-3">Referrer</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Points</th>
                      <th className="py-2.5 px-3 rounded-r">Joined At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {referrals.map((ref) => (
                      <tr key={ref._id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-mono text-slate-300">{ref.referred_telegram_id}</td>
                        <td className="py-2.5 px-3 font-mono text-sky-400">{ref.referrer_telegram_id}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              ref.status === 'rewarded' || ref.status === 'verified'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : ref.status === 'rejected' || ref.status === 'reversed'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {ref.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-white">+{ref.points_awarded || 0}</td>
                        <td className="py-2.5 px-3 text-slate-500">
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
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" /> Top Referrers
            </h2>

            {leaderboard.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">No leaderboard entries yet.</div>
            ) : (
              <div className="space-y-2.5">
                {leaderboard.map((user, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded bg-slate-800 text-sky-400 font-bold text-[10px] flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <div>
                        <span className="text-xs font-semibold text-white block">{user.first_name}</span>
                        <span className="text-[10px] text-slate-500">ID: {user.user_telegram_id}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-400">{user.verified_count}</span>
                      <span className="text-[10px] text-slate-500 block">verified</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
