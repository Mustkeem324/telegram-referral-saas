'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import {
  BookOpen,
  Radio,
  Share2,
  ShieldCheck,
  Award,
  Sparkles,
  CheckCircle2,
  Clock,
  UserCheck,
  ChevronRight,
  ExternalLink,
  Gift,
  Zap,
  TrendingUp,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function HowItWorksPage() {
  const [activeTab, setActiveTab] = useState<'creators' | 'referrers' | 'antifraud'>('creators');

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl mx-auto pb-12">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-navy-800 via-navy-850 to-navy-800 border border-slate-800/80 p-8 shadow-card">
          <div className="absolute top-0 right-0 w-96 h-96 bg-electric/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-electric/10 border border-electric/25 text-electric text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Complete System Guide & Interactive Tutorial</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
              How <span className="text-transparent bg-clip-text bg-gradient-to-r from-electric via-cyanAccent to-blue-400">TeleGrowth</span> Works
            </h1>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              TeleGrowth turns Telegram channels and supergroups into viral referral engines using native Telegram Bot API invite links, real-time anti-fraud verification, and automated milestone rewards.
            </p>

            {/* Quick action buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href="https://t.me/TeleGrowthnxbot"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-electric hover:bg-electric/90 text-white text-xs font-bold transition shadow-md shadow-electric/25"
              >
                <span>Launch @TeleGrowthnxbot</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <Link
                href="/campaigns/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-navy-900 border border-slate-700/80 hover:border-slate-600 text-white text-xs font-bold transition"
              >
                <span>Create Campaign</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-4">
          <button
            onClick={() => setActiveTab('creators')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'creators'
                ? 'bg-electric text-white shadow-md shadow-electric/20'
                : 'bg-navy-800 text-slate-400 hover:text-white border border-slate-800/80'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>For Channel Owners & Creators</span>
          </button>
          <button
            onClick={() => setActiveTab('referrers')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'referrers'
                ? 'bg-electric text-white shadow-md shadow-electric/20'
                : 'bg-navy-800 text-slate-400 hover:text-white border border-slate-800/80'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>For Community Referrers</span>
          </button>
          <button
            onClick={() => setActiveTab('antifraud')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'antifraud'
                ? 'bg-electric text-white shadow-md shadow-electric/20'
                : 'bg-navy-800 text-slate-400 hover:text-white border border-slate-800/80'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Anti-Fraud & Fair Play Engine</span>
          </button>
        </div>

        {/* Tab 1: Creators Guide */}
        {activeTab === 'creators' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Step 1 */}
              <div className="bg-navy-800 border border-slate-800/80 rounded-2xl p-6 shadow-card hover:border-slate-700/80 transition flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl bg-electric/15 text-electric font-black text-sm flex items-center justify-center border border-electric/30">
                      1
                    </span>
                    <span className="text-[10px] font-mono text-cyanAccent uppercase tracking-wider bg-cyanAccent/10 px-2 py-0.5 rounded border border-cyanAccent/20">
                      Step 1 • Connect Chat
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">Add Bot as Administrator</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Add <code className="text-cyanAccent font-mono">@TeleGrowthnxbot</code> to your Telegram channel or group as an Administrator.
                  </p>
                  <div className="bg-navy-900/80 rounded-xl p-3 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                    <div className="flex items-center gap-2 text-successGreen font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Invite Users via Link (Mandatory)</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Manage Chat (for join tracking)</span>
                    </div>
                  </div>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-800/60">
                  <a
                    href="https://t.me/TeleGrowthnxbot?startgroup=true&admin=invite_users"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-electric hover:text-cyanAccent flex items-center gap-1 transition"
                  >
                    <span>1-Click Add Bot to Telegram</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-navy-800 border border-slate-800/80 rounded-2xl p-6 shadow-card hover:border-slate-700/80 transition flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl bg-electric/15 text-electric font-black text-sm flex items-center justify-center border border-electric/30">
                      2
                    </span>
                    <span className="text-[10px] font-mono text-cyanAccent uppercase tracking-wider bg-cyanAccent/10 px-2 py-0.5 rounded border border-cyanAccent/20">
                      Step 2 • Campaign Rules
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">Configure Viral Campaign</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Set up your growth rules in Creator Studio: define points rewarded per verified join, retention hold periods (e.g. 24–72 hours), and anti-fraud sensitivity.
                  </p>
                  <div className="bg-navy-900/80 rounded-xl p-3 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Points per Join:</span>
                      <span className="text-white font-mono font-bold">+10 to +100</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Retention Hold:</span>
                      <span className="text-warningOrange font-mono font-bold">1–7 Days</span>
                    </div>
                  </div>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-800/60">
                  <Link
                    href="/campaigns/new"
                    className="text-xs font-semibold text-electric hover:text-cyanAccent flex items-center gap-1 transition"
                  >
                    <span>Open Campaign Creator Studio</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-navy-800 border border-slate-800/80 rounded-2xl p-6 shadow-card hover:border-slate-700/80 transition flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl bg-electric/15 text-electric font-black text-sm flex items-center justify-center border border-electric/30">
                      3
                    </span>
                    <span className="text-[10px] font-mono text-cyanAccent uppercase tracking-wider bg-cyanAccent/10 px-2 py-0.5 rounded border border-cyanAccent/20">
                      Step 3 • Milestone Prizes
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">Attach Milestone Rewards</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Incentivize top referrers by attaching reward milestones (e.g. 5 invites = VIP access, 10 invites = Amazon or Steam gift card, 25 invites = Telegram Premium).
                  </p>
                  <div className="bg-navy-900/80 rounded-xl p-3 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                    <div className="flex items-center gap-2 text-electric font-semibold">
                      <Gift className="w-3.5 h-3.5" />
                      <span>Automated DM delivery as soon as milestone is reached</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                      <span>Zero duplicate claims guaranteed via append-only ledger</span>
                    </div>
                  </div>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-800/60">
                  <Link
                    href="/rewards"
                    className="text-xs font-semibold text-electric hover:text-cyanAccent flex items-center gap-1 transition"
                  >
                    <span>Configure Rewards & Inventory</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-navy-800 border border-slate-800/80 rounded-2xl p-6 shadow-card hover:border-slate-700/80 transition flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl bg-electric/15 text-electric font-black text-sm flex items-center justify-center border border-electric/30">
                      4
                    </span>
                    <span className="text-[10px] font-mono text-cyanAccent uppercase tracking-wider bg-cyanAccent/10 px-2 py-0.5 rounded border border-cyanAccent/20">
                      Step 4 • Live Telemetry
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">Track Joins & Risk Analytics</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Watch members join in real time on the live telemetry chart. Fraudulent bots, disposable Telegram numbers, and premature leavers are caught and reversed automatically.
                  </p>
                  <div className="bg-navy-900/80 rounded-xl p-3 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Leaderboard Rankings:</span>
                      <span className="text-successGreen font-mono font-bold">Auto-calculated</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Fraud Detection:</span>
                      <span className="text-cyanAccent font-mono font-bold">Sub-second inspection</span>
                    </div>
                  </div>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-800/60">
                  <Link
                    href="/dashboard"
                    className="text-xs font-semibold text-electric hover:text-cyanAccent flex items-center gap-1 transition"
                  >
                    <span>View Analytics Dashboard</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Referrers Guide */}
        {activeTab === 'referrers' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-navy-800 border border-slate-800/80 rounded-2xl p-6 shadow-card space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-electric/15 text-electric flex items-center justify-center border border-electric/30">
                  <Share2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">1. Get Your Link</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Open <code className="text-cyanAccent font-mono">@TeleGrowthnxbot</code> and type <code className="text-white font-mono bg-navy-900 px-1 py-0.5 rounded">/link</code>. You receive a cryptographic Telegram invite link tied directly to your user ID.
                </p>
                <div className="bg-navy-900/80 rounded-xl p-3 border border-slate-800 text-[11px] font-mono text-cyanAccent select-all">
                  https://t.me/+TeleGrowth_x92...
                </div>
              </div>

              <div className="bg-navy-800 border border-slate-800/80 rounded-2xl p-6 shadow-card space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-cyanAccent/15 text-cyanAccent flex items-center justify-center border border-cyanAccent/30">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">2. Share & Hold</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Share your link with your friends or community. When they join, they enter a short retention period (e.g. 24 hours). Once verified, your points are minted!
                </p>
                <div className="flex items-center gap-2 text-warningOrange text-xs font-semibold bg-warningOrange/10 border border-warningOrange/20 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Members must stay in channel during retention hold</span>
                </div>
              </div>

              <div className="bg-navy-800 border border-slate-800/80 rounded-2xl p-6 shadow-card space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-successGreen/15 text-successGreen flex items-center justify-center border border-successGreen/30">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">3. Win Prizes & Rank</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Type <code className="text-white font-mono bg-navy-900 px-1 py-0.5 rounded">/stats</code> to check points and rank. As you hit milestone thresholds, the bot automatically sends your rewards!
                </p>
                <div className="flex items-center gap-2 text-successGreen text-xs font-semibold bg-successGreen/10 border border-successGreen/20 rounded-xl p-3">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>Instant DM voucher codes upon milestone hit</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Anti-Fraud Engine */}
        {activeTab === 'antifraud' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-navy-800 border border-slate-800/80 rounded-2xl p-6 shadow-card space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-electric" /> Multi-Layer Anti-Fraud Defense Architecture
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  TeleGrowth prevents click farms, self-referrals, disposable bot accounts, and hit-and-run members.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-navy-900/70 border border-slate-800 rounded-xl p-4 space-y-2">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-warningOrange" /> Retention Period Hold
                  </span>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Referrals are initially placed in a &quot;verification_pending&quot; status. If the member leaves the channel before the required hold time (e.g. 72 hours), the referral is immediately reversed and zero points are awarded.
                  </p>
                </div>

                <div className="bg-navy-900/70 border border-slate-800 rounded-xl p-4 space-y-2">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-electric" /> Account Age & Activity Filter
                  </span>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Disposable or brand-new Telegram accounts created purely for referral farming are flagged by risk scoring and quarantined for admin review.
                  </p>
                </div>

                <div className="bg-navy-900/70 border border-slate-800 rounded-xl p-4 space-y-2">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyanAccent" /> Cryptographic Attribution
                  </span>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Links are generated directly using Telegram&apos;s native <code className="text-cyanAccent font-mono">createChatInviteLink</code> API. Telegram servers themselves record which link was used to join, preventing URL tampering or spoofing.
                  </p>
                </div>

                <div className="bg-navy-900/70 border border-slate-800 rounded-xl p-4 space-y-2">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-successGreen" /> Append-Only Transaction Ledger
                  </span>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Every point minted and every reward distributed is signed with SHA-256 hash chains, guaranteeing provable delivery and zero double-claiming.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Interactive FAQ Section */}
        <div className="bg-navy-800 border border-slate-800/80 rounded-2xl p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyanAccent" /> Frequently Asked Questions
            </h3>
            <span className="text-xs text-slate-500 font-medium">Clear Answers</span>
          </div>

          <div className="divide-y divide-slate-800/70 space-y-3 pt-1">
            <div className="pt-3">
              <h4 className="text-xs font-bold text-white mb-1">How does TeleGrowth track who invited whom?</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                When a user asks for their invite link (via <code className="text-cyanAccent font-mono">/link</code> in the bot or web dashboard), TeleGrowth calls Telegram&apos;s <code className="text-cyanAccent font-mono">createChatInviteLink</code> API to generate a distinct invite link tied to that member. When a newcomer clicks it and joins, Telegram notifies our bot with the specific link used.
              </p>
            </div>

            <div className="pt-3">
              <h4 className="text-xs font-bold text-white mb-1">Can I connect multiple channels or groups?</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Yes! You can connect as many channels and groups as your workspace plan allows. You can also require members to join multiple channels before a referral is verified.
              </p>
            </div>

            <div className="pt-3">
              <h4 className="text-xs font-bold text-white mb-1">How are rewards delivered to members?</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Rewards can be configured as digital codes (vouchers, keys, coupons) or roles. As soon as a user crosses a milestone threshold of verified referrals, the central bot sends the reward directly to their Telegram private chat.
              </p>
            </div>

            <div className="pt-3">
              <h4 className="text-xs font-bold text-white mb-1">What happens if a user leaves the channel immediately?</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                If the user leaves before the campaign&apos;s retention period expires, TeleGrowth detects the departure event via Telegram webhooks/polling, cancels the pending referral, voids the points, and flags the incident in the Anti-Fraud monitor.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}