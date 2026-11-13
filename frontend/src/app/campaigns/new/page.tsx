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
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/campaigns"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Campaign Creator Studio</h1>
            <p className="text-xs text-slate-400">Configure viral rules, multi-channel gates, and milestone rewards.</p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-medium text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Basic Details */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-sky-400" /> 1. Campaign Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-slate-300 block mb-1">Campaign Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mega Summer Community Airdrop & Referral Drive"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-medium text-slate-300 block mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe requirements and rewards for participants..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Campaign Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="referral">Referral Drive (Points & Milestones)</option>
                  <option value="giveaway">Provably Fair Giveaway (Raffle Pool)</option>
                  <option value="hybrid">Hybrid (Points + Giveaway Tickets)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Points per Verified Referral</label>
                <input
                  type="number"
                  min="0"
                  value={pointsPerRef}
                  onChange={(e) => setPointsPerRef(Number(e.target.value))}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* 2. Multi-Channel Requirements */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400" /> 2. Multi-Channel Join Requirements
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Referred members must join all selected channels to unlock rewards.
                </p>
              </div>
              <Link href="/channels" className="text-xs text-sky-400 hover:text-sky-300 font-medium">
                + Connect More Chats
              </Link>
            </div>

            {chats.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-800 text-xs text-slate-400 text-center">
                No verified channels connected yet. Go to <Link href="/channels" className="text-sky-400 underline">Connected Chats</Link> to add your channel.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {chats.map((chat) => {
                  const isChecked = selectedChats.includes(chat.chat_id);
                  return (
                    <div
                      key={chat._id}
                      onClick={() => toggleChatSelection(chat.chat_id)}
                      className={`cursor-pointer p-3 rounded-lg border flex items-center justify-between transition-all ${
                        isChecked
                          ? 'bg-sky-500/10 border-sky-500/40 text-white'
                          : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-semibold block">{chat.title}</span>
                        <span className="text-[10px] text-slate-500 uppercase">{chat.type} • ID: {chat.chat_id}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded border-slate-700 text-sky-500 focus:ring-0"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Milestone Rewards */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" /> 3. Milestone Bonus Rewards
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automatic prizes distributed via immutable ledger when referrers hit milestone goals.
                </p>
              </div>
              <button
                type="button"
                onClick={addReward}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-sky-400"
              >
                <Plus className="w-3.5 h-3.5" /> Add Milestone
              </button>
            </div>

            <div className="space-y-3">
              {rewards.map((r, index) => (
                <div key={index} className="p-3.5 rounded-lg bg-slate-800/60 border border-slate-700/60 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-4">
                    <label className="text-[10px] font-semibold uppercase text-slate-400 block mb-1">Reward Name</label>
                    <input
                      type="text"
                      value={r.name}
                      onChange={(e) => {
                        const copy = [...rewards];
                        copy[index].name = e.target.value;
                        setRewards(copy);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-[10px] font-semibold uppercase text-slate-400 block mb-1">Type</label>
                    <select
                      value={r.type}
                      onChange={(e) => {
                        const copy = [...rewards];
                        copy[index].type = e.target.value;
                        setRewards(copy);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white"
                    >
                      <option value="points">Points Bonus</option>
                      <option value="software_key">Software / License Key</option>
                      <option value="coupon_code">Coupon / Promo Code</option>
                      <option value="digital_file">E-Book / PDF Link</option>
                      <option value="giveaway_ticket">Bonus Giveaway Entries</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-semibold uppercase text-slate-400 block mb-1">Refs Req.</label>
                    <input
                      type="number"
                      min="1"
                      value={r.milestone_referrals_required}
                      onChange={(e) => {
                        const copy = [...rewards];
                        copy[index].milestone_referrals_required = Number(e.target.value);
                        setRewards(copy);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-semibold uppercase text-slate-400 block mb-1">Bonus Pts</label>
                    <input
                      type="number"
                      min="0"
                      value={r.points_value}
                      onChange={(e) => {
                        const copy = [...rewards];
                        copy[index].points_value = Number(e.target.value);
                        setRewards(copy);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeReward(index)}
                      className="p-1.5 text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Link
              href="/campaigns"
              className="px-5 py-2.5 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-white shadow-lg shadow-sky-500/20 disabled:opacity-50 transition-all"
            >
              {loading ? 'Creating Campaign...' : 'Publish Campaign'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
