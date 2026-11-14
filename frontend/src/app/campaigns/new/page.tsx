'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '../../../components/DashboardLayout';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/AuthContext';
import {
  Megaphone,
  ArrowLeft,
  Plus,
  Trash2,
  Radio,
  Award,
  Shield,
  HelpCircle,
  Sparkles,
  CheckCircle2,
  Star,
} from 'lucide-react';
import Link from 'next/link';

export default function NewCampaignPage() {
  const router = useRouter();
  const { activeWorkspace } = useAuth();

  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'referral' | 'giveaway' | 'hybrid'>('referral');
  const [pointsPerRef, setPointsPerRef] = useState(10);
  const [retentionDays, setRetentionDays] = useState(0);
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [premiumMultiplier, setPremiumMultiplier] = useState('2');
  const [premiumFastTrack, setPremiumFastTrack] = useState(true);
  const [requirePremiumOnly, setRequirePremiumOnly] = useState(false);

  // Milestone rewards state
  const [rewards, setRewards] = useState<
    Array<{ name: string; type: string; milestone_referrals_required: number; points_value: number; delivery_payload: string }>
  >([
    {
      name: 'Welcome Bonus',
      type: 'points',
      milestone_referrals_required: 1,
      points_value: 10,
      delivery_payload: '',
    },
  ]);

  useEffect(() => {
    if (activeWorkspace) {
      api.getWorkspaceChats(activeWorkspace._id)
        .then((data) => setChats(data))
        .catch(console.error);
    }
  }, [activeWorkspace]);

  const addReward = () => {
    setRewards([
      ...rewards,
      {
        name: `Milestone ${rewards.length + 1}`,
        type: 'points',
        milestone_referrals_required: (rewards.length + 1) * 5,
        points_value: 50,
        delivery_payload: '',
      },
    ]);
  };

  const removeReward = (index: number) => {
    setRewards(rewards.filter((_, idx) => idx !== index));
  };

  const toggleChatSelection = (chatId: string) => {
    if (selectedChats.includes(chatId)) {
      setSelectedChats(selectedChats.filter((id) => id !== chatId));
    } else {
      setSelectedChats([...selectedChats, chatId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      setError('Campaign title is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.createCampaign({
        title,
        description,
        type,
        reward_policy: {
          points_per_referral: Number(pointsPerRef),
          retention_period_days: Number(retentionDays),
          hold_period_hours: 0,
          allow_custom_rewards: true,
          premium_multiplier: Number(premiumMultiplier),
          premium_fast_track: premiumFastTrack,
          require_premium_only: requirePremiumOnly,
        },
        fraud_rules: {
          max_referrals_per_ip_per_hour: 5,
          max_referrals_per_user_per_day: 50,
          auto_hold_suspicious: true,
          suspicious_threshold_score: 60,
        },
        required_chat_ids: selectedChats,
        rewards,
      });

      router.push('/campaigns');
    } catch (err: any) {
      setError(err.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <div className="flex items-center gap-3">
          <Link
            href="/campaigns"
            className="p-2.5 rounded-xl bg-navy-800 border border-navy-700 text-slate-400 hover:text-white hover:border-navy-650 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Campaign Creator Studio</h1>
            <p className="text-xs text-slate-400">Configure viral rules, multi-channel gates, and milestone rewards.</p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-dangerRed/10 border border-dangerRed/30 text-xs font-semibold text-dangerRed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Basic Details */}
          <div className="bg-navy-800/90 border border-navy-700/80 rounded-2xl p-6 space-y-5 shadow-card">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-electric" /> 1. Campaign Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wider text-[11px]">
                  Campaign Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mega Summer Community Airdrop & Referral Drive"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric transition-colors"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wider text-[11px]">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe requirements and rewards for participants..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wider text-[11px]">
                  Campaign Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric transition-colors"
                >
                  <option value="referral">Referral Drive (Points & Milestones)</option>
                  <option value="giveaway">Provably Fair Giveaway (Raffle Pool)</option>
                  <option value="hybrid">Hybrid (Points + Giveaway Tickets)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wider text-[11px]">
                  Points per Verified Referral
                </label>
                <input
                  type="number"
                  min="0"
                  value={pointsPerRef}
                  onChange={(e) => setPointsPerRef(Number(e.target.value))}
                  className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Telegram Premium Intelligence & Multipliers */}
          <div className="bg-navy-800/90 border border-navy-700/80 rounded-2xl p-6 space-y-4 shadow-card">
            <div className="flex items-center justify-between border-b border-navy-700/70 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-purple-600 flex items-center justify-center text-white shadow-sm shadow-purple-500/25">
                  <Star className="w-4 h-4 fill-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Telegram Premium Intelligence & Multipliers
                  </h3>
                  <p className="text-[11px] text-slate-400">Boost referral velocity by giving extra rewards and fast-track verification for Telegram Premium members.</p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
                ⭐ Premium Engine
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Telegram Premium Point Multiplier
                </label>
                <select
                  value={premiumMultiplier}
                  onChange={(e) => setPremiumMultiplier(e.target.value)}
                  className="w-full bg-navy-900 border border-navy-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-electric"
                >
                  <option value="1">1x (Standard / No Booster)</option>
                  <option value="1.5">1.5x Points</option>
                  <option value="2">2x Points (Recommended • {pointsPerRef * 2} pts)</option>
                  <option value="3">3x Points (High Value • {pointsPerRef * 3} pts)</option>
                  <option value="5">5x Points (VIP Communities • {pointsPerRef * 5} pts)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                  Referrers who bring genuine Telegram Premium subscribers automatically receive multiplied points.
                </p>
              </div>

              <div className="space-y-3.5 pt-1">
                <label className="flex items-start gap-3 cursor-pointer p-2.5 rounded-xl bg-navy-900/40 border border-navy-700/50 hover:border-navy-650 transition">
                  <input
                    type="checkbox"
                    checked={premiumFastTrack}
                    onChange={(e) => setPremiumFastTrack(e.target.checked)}
                    className="rounded border-navy-650 text-electric focus:ring-0 mt-0.5 w-4 h-4"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">Fast-Track Verification</span>
                    <span className="text-[11px] text-slate-400 block leading-snug">
                      Bypass retention hold for paid Telegram accounts (safe from click farms & disposable bots).
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer p-2.5 rounded-xl bg-navy-900/40 border border-navy-700/50 hover:border-navy-650 transition">
                  <input
                    type="checkbox"
                    checked={requirePremiumOnly}
                    onChange={(e) => setRequirePremiumOnly(e.target.checked)}
                    className="rounded border-navy-650 text-electric focus:ring-0 mt-0.5 w-4 h-4"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">Premium-Only Participation</span>
                    <span className="text-[11px] text-slate-400 block leading-snug">
                      Only count joins from users with an active Telegram Premium subscription (strict VIP mode).
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* 2. Multi-Channel Requirements */}
          <div className="bg-navy-800/90 border border-navy-700/80 rounded-2xl p-6 space-y-4 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-cyanAccent" /> 2. Multi-Channel Join Requirements
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Referred members must join all selected channels to unlock rewards.
                </p>
              </div>
              <Link href="/channels" className="text-xs text-electric hover:text-electric-light font-bold">
                + Connect More Chats
              </Link>
            </div>

            {chats.length === 0 ? (
              <div className="p-5 rounded-xl bg-navy-900/60 border border-navy-700/80 text-xs text-slate-400 text-center space-y-1">
                <p>No verified channels connected yet.</p>
                <Link href="/channels" className="text-electric hover:underline font-semibold block">
                  Go to Connected Chats to add your Telegram Channel or Group →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {chats.map((chat) => {
                  const isChecked = selectedChats.includes(chat.chat_id);
                  return (
                    <div
                      key={chat._id}
                      onClick={() => toggleChatSelection(chat.chat_id)}
                      className={`cursor-pointer p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                        isChecked
                          ? 'bg-electric/10 border-electric/40 text-white shadow-sm'
                          : 'bg-navy-900/60 border-navy-700/60 text-slate-400 hover:border-navy-600'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold block text-white">{chat.title}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">{chat.type} • ID: {chat.chat_id}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded border-navy-650 text-electric focus:ring-0"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Milestone Rewards */}
          <div className="bg-navy-800/90 border border-navy-700/80 rounded-2xl p-6 space-y-4 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-warningOrange" /> 3. Milestone Bonus Rewards
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automatic prizes distributed via immutable ledger when referrers hit milestone goals.
                </p>
              </div>
              <button
                type="button"
                onClick={addReward}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-750 hover:bg-navy-700 border border-navy-650 text-xs font-bold text-electric transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Milestone
              </button>
            </div>

            <div className="space-y-3">
              {rewards.map((r, index) => (
                <div key={index} className="p-4 rounded-xl bg-navy-900/70 border border-navy-700/70 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-4">
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Reward Name</label>
                    <input
                      type="text"
                      value={r.name}
                      onChange={(e) => {
                        const copy = [...rewards];
                        copy[index].name = e.target.value;
                        setRewards(copy);
                      }}
                      className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-electric"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Type</label>
                    <select
                      value={r.type}
                      onChange={(e) => {
                        const copy = [...rewards];
                        copy[index].type = e.target.value;
                        setRewards(copy);
                      }}
                      className="w-full bg-navy-800 border border-navy-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-electric"
                    >
                      <option value="points">Points Bonus</option>
                      <option value="software_key">Software / License Key</option>
                      <option value="coupon_code">Coupon / Promo Code</option>
                      <option value="digital_file">E-Book / PDF Link</option>
                      <option value="giveaway_ticket">Bonus Giveaway Entries</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Refs Req.</label>
                    <input
                      type="number"
                      min="1"
                      value={r.milestone_referrals_required}
                      onChange={(e) => {
                        const copy = [...rewards];
                        copy[index].milestone_referrals_required = Number(e.target.value);
                        setRewards(copy);
                      }}
                      className="w-full bg-navy-800 border border-navy-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-electric"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Bonus Pts</label>
                    <input
                      type="number"
                      min="0"
                      value={r.points_value}
                      onChange={(e) => {
                        const copy = [...rewards];
                        copy[index].points_value = Number(e.target.value);
                        setRewards(copy);
                      }}
                      className="w-full bg-navy-800 border border-navy-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-electric"
                    />
                  </div>

                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeReward(index)}
                      className="p-1.5 text-slate-400 hover:text-dangerRed transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Link
              href="/campaigns"
              className="px-5 py-2.5 rounded-xl border border-navy-700 text-xs font-bold text-slate-300 hover:bg-navy-800 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-electric hover:bg-electric-hover text-xs font-bold text-white shadow-lg shadow-electric/25 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? 'Creating Campaign...' : 'Publish Campaign'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
