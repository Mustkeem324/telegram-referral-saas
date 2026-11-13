'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/AuthContext';
import { Radio, Shield, Send, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const { loginWithDev, user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (user) {
    router.push('/dashboard');
    return null;
  }

  const handleDevLogin = async (role: 'superadmin' | 'user') => {
    setLoading(true);
    try {
      await loginWithDev(role);
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-sky-500/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center shadow-xl shadow-sky-500/25 border border-sky-400/30">
            <Radio className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-white">
          TeleGrowth SaaS
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          The Enterprise Referral & Provably-Fair Giveaway Platform for Telegram Communities
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/90 py-8 px-6 shadow-2xl border border-slate-800 rounded-2xl sm:px-10 backdrop-blur-xl">
          <div className="space-y-4">
            <div className="border border-sky-500/20 bg-sky-500/5 rounded-xl p-4 text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sky-400 text-sm">
                <Zap className="w-4 h-4" /> Multi-Tenant Architecture
              </div>
              <ul className="space-y-1 text-slate-400">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Individual Telegram invite link tracking</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Multi-channel membership verification</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Ledger-based milestone reward system</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Cryptographic provably-fair giveaways</li>
              </ul>
            </div>

            <div className="pt-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Fast Access Login
              </label>

              <button
                onClick={() => handleDevLogin('user')}
                disabled={loading}
                className="w-full flex items-center justify-between px-4 py-3 border border-sky-500/40 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-medium text-sm transition-all shadow-lg shadow-sky-600/20 disabled:opacity-50"
              >
                <div className="flex items-center gap-2.5">
                  <Send className="w-4 h-4" />
                  <span>Enter as Campaign Creator</span>
                </div>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleDevLogin('superadmin')}
                disabled={loading}
                className="mt-3 w-full flex items-center justify-between px-4 py-3 border border-amber-500/40 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-amber-300 font-medium text-sm transition-all shadow-md disabled:opacity-50"
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Enter as Platform Super Admin</span>
                </div>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center pt-3 border-t border-slate-800">
              <p className="text-[11px] text-slate-500">
                Or launch <a href="https://t.me/tg_ref_saas_bot" target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">@tg_ref_saas_bot</a> inside Telegram for seamless WebApp initialization.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
