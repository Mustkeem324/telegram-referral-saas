'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Lock, Eye, Database, CheckCircle2 } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 font-sans selection:bg-electric selection:text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-2xl shadow-2xl space-y-8">
          <div className="border-b border-white/10 pb-6">
            <div className="w-12 h-12 rounded-2xl bg-electric/15 text-electric border border-electric/30 flex items-center justify-center mb-4 shadow-lg shadow-electric/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Privacy Policy & Data Security
            </h1>
            <p className="text-xs text-slate-400 mt-2">
              Last updated: November 2026 • Effective for TeleGrowth Telegram Bot & Web Platform
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-electric" />
              1. Information We Collect
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              TeleGrowth only collects minimal Telegram account information strictly necessary to provide referral attribution, campaign reward delivery, and anti-fraud protection:
            </p>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-5">
              <li><b>Telegram Public ID:</b> Used as your primary cryptographic referral identifier.</li>
              <li><b>First Name & Username:</b> Used to display your position on community leaderboards.</li>
              <li><b>Telegram Premium Status:</b> Used exclusively to calculate point booster multipliers.</li>
              <li><b>Join & Leave Timestamps:</b> Used to enforce anti-fraud retention hold periods.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-cyanAccent" />
              2. Custom Bot API Tokens & Encryption
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              If you connect a custom branded bot via BotFather, your API token is encrypted at rest using industry-standard <b>AES-256-GCM</b> authenticated encryption with unique initialization vectors. TeleGrowth engineers and third parties cannot view your raw bot token.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" />
              3. Data Retention & Third Parties
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              We never sell, rent, or monetize your Telegram user data or channel subscriber lists. Referral metrics are retained only for the duration of the community campaign. When you disconnect a bot or delete a campaign, associated tracking links are purged.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              4. Contact & Developer Support
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              For any questions, data deletion requests, or technical inquiries regarding TeleGrowth privacy practices, please contact our Lead Developer directly:
            </p>
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/5 flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold">Lead Developer & Admin:</span>
              <a
                href="https://t.me/nxproo"
                target="_blank"
                rel="noreferrer"
                className="text-electric hover:underline font-mono"
              >
                @nxproo (https://t.me/nxproo)
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
