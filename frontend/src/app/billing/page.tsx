'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import {
  CreditCard,
  Sparkles,
  CheckCircle2,
  FileText,
  Clock,
  Zap,
  ArrowRight,
  ShieldCheck,
  Star,
} from 'lucide-react';

export default function BillingPage() {
  const { activeWorkspace, refreshUserData } = useAuth();

  const [plans, setPlans] = useState<any[]>([]);
  const [currentSub, setCurrentSub] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [upgradingCode, setUpgradingCode] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadBillingData();
  }, [activeWorkspace]);

  const loadBillingData = async () => {
    try {
      const [plansData, subData, invData] = await Promise.all([
        api.getPlans(),
        api.getCurrentSubscription(),
        api.getInvoices(),
      ]);
      setPlans(plansData);
      setCurrentSub(subData.subscription);
      setUsage(subData.usage);
      setInvoices(invData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpgrade = async (planCode: string) => {
    setUpgradingCode(planCode);
    setSuccessMsg(null);
    try {
      await api.upgradeSubscription({
        plan_code: planCode,
        billing_cycle: billingCycle,
        provider: 'telegram_stars',
      });
      setSuccessMsg(`Upgraded to ${planCode.toUpperCase()} plan successfully!`);
      await loadBillingData();
      await refreshUserData();
    } catch (err: any) {
      alert(err.message || 'Upgrade failed');
    } finally {
      setUpgradingCode(null);
    }
  };

  const currentPlanCode = currentSub?.plan_id?.code || 'free';

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <span>Subscription & Growth Plans</span>
              <span className="text-xs font-bold text-electric bg-electric/10 px-2.5 py-0.5 rounded-full border border-electric/25">
                Backend Enforced
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Select a tier to scale your campaigns. In-app checkout supported via Telegram Stars ⭐ and Cards.
            </p>
          </div>

          <div className="flex items-center bg-navy-800 border border-navy-700 p-1 rounded-xl shadow-sm">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-electric text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                billingCycle === 'yearly'
                  ? 'bg-electric text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Yearly</span>
              <span className="bg-successGreen/20 text-successGreen text-[9px] px-1.5 py-0.5 rounded font-extrabold">SAVE 20%</span>
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="p-4 rounded-xl bg-successGreen/10 border border-successGreen/30 text-successGreen text-xs font-bold flex items-center gap-2.5 shadow-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Current Usage Quotas */}
        <div className="bg-navy-800/90 border border-navy-700/80 rounded-2xl p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-electric" /> Current Monthly Quota Consumption
            </h2>
            <span className="text-xs font-bold text-cyanAccent uppercase">
              Plan: {currentSub?.plan_id?.name || 'Free'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-navy-750/70 border border-navy-700/60 p-4 rounded-xl space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Active Campaigns
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-extrabold text-white">
                  {usage?.active_campaigns_count || 0}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  / {currentSub?.plan_id?.max_active_campaigns || 1} allowed
                </span>
              </div>
            </div>

            <div className="bg-navy-750/70 border border-navy-700/60 p-4 rounded-xl space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Connected Chats
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-extrabold text-white">
                  {usage?.connected_chats_count || 0}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  / {currentSub?.plan_id?.max_connected_chats || 1} allowed
                </span>
              </div>
            </div>

            <div className="bg-navy-750/70 border border-navy-700/60 p-4 rounded-xl space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Monthly Referrals
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-extrabold text-successGreen">
                  {usage?.verified_referrals_count || 0}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  / {(currentSub?.plan_id?.max_verified_referrals_monthly || 100).toLocaleString()} cap
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Plan Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {plans.map((p) => {
            const isCurrent = currentPlanCode === p.code;
            const isPopular = p.code === 'pro';
            const price = billingCycle === 'yearly' ? p.price_yearly_usd : p.price_monthly_usd;
            const stars = billingCycle === 'yearly' ? p.telegram_stars_yearly : p.telegram_stars_monthly;

            return (
              <div
                key={p._id}
                className={`bg-navy-800/90 rounded-2xl p-6 border flex flex-col justify-between transition-all relative shadow-card ${
                  isCurrent
                    ? 'border-electric shadow-card-hover ring-1 ring-electric/30'
                    : isPopular
                    ? 'border-amber-500/50 shadow-lg'
                    : 'border-navy-700/80 hover:border-navy-650'
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-[10px] uppercase px-3 py-0.5 rounded-full shadow-md">
                    Most Popular
                  </span>
                )}

                <div>
                  <h3 className="text-base font-bold text-white capitalize">{p.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 min-h-[32px] leading-relaxed">{p.description}</p>

                  <div className="mt-4 mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-white">${price}</span>
                      <span className="text-xs text-slate-400">/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
                    </div>
                    {stars > 0 && (
                      <span className="text-xs text-amber-400 font-bold block mt-1">
                        ⭐ {stars.toLocaleString()} Stars
                      </span>
                    )}
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-300 border-t border-navy-700/80 pt-4">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-electric shrink-0" />
                      <span><strong>{p.max_active_campaigns}</strong> Active Campaigns</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-electric shrink-0" />
                      <span><strong>{p.max_connected_chats}</strong> Connected Chats</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-electric shrink-0" />
                      <span><strong>{p.max_verified_referrals_monthly.toLocaleString()}</strong> Referrals/mo</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-electric shrink-0" />
                      <span>Anti-Fraud: <strong className="uppercase text-[10px]">{p.features.anti_fraud_tier}</strong></span>
                    </li>
                    {p.features.automated_rewards && (
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-successGreen shrink-0" />
                        <span>Automated Rewards Ledger</span>
                      </li>
                    )}
                    {p.features.custom_branding && (
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-successGreen shrink-0" />
                        <span>Custom Branding & Bot</span>
                      </li>
                    )}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-navy-700/80">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl bg-navy-750 border border-navy-650 text-xs font-bold text-slate-400 cursor-default"
                    >
                      Active Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(p.code)}
                      disabled={upgradingCode === p.code}
                      className="w-full py-2.5 rounded-xl bg-electric hover:bg-electric-hover text-xs font-bold text-white shadow-lg shadow-electric/25 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {upgradingCode === p.code ? 'Processing...' : `Upgrade with Stars ⭐`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Invoices Table */}
        <div className="bg-navy-800/90 border border-navy-700/80 rounded-2xl p-6 space-y-4 shadow-card">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-electric" /> Invoices & Receipts
          </h2>

          {invoices.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No payment invoices generated yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-navy-900/60 text-slate-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 rounded-l-xl">Invoice Number</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Currency</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 rounded-r-xl">Billing Period</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700/60">
                  {invoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-navy-750/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-white">{inv.invoice_number}</td>
                      <td className="py-3 px-3 font-bold text-successGreen">{inv.amount}</td>
                      <td className="py-3 px-3 uppercase text-[10px] font-bold text-slate-400">{inv.currency}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-successGreen/15 text-successGreen border border-successGreen/30">
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                        {new Date(inv.period_start).toLocaleDateString()} — {new Date(inv.period_end).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
