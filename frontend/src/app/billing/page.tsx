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
      <div className="space-y-8 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Subscription & SaaS Plans</h1>
            <p className="text-sm text-slate-400 mt-1">
              Backend-enforced quotas. Upgrade seamlessly using Telegram Stars ⭐ or Card.
            </p>
          </div>

          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                billingCycle === 'yearly'
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Yearly <span className="bg-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.2 rounded font-bold">SAVE 20%</span>
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {successMsg}
          </div>
        )}

        {/* Current Usage Quotas */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Current Monthly Quota Consumption</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-slate-800/40 border border-slate-700/60 p-4 rounded-xl">
              <span className="text-xs text-slate-400 font-medium block">Active Campaigns</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold text-white">{usage?.active_campaigns_count || 0}</span>
                <span className="text-xs text-slate-400">/ {currentSub?.plan_id?.max_active_campaigns || 1} allowed</span>
              </div>
            </div>

            <div className="bg-slate-800/40 border border-slate-700/60 p-4 rounded-xl">
              <span className="text-xs text-slate-400 font-medium block">Connected Chats</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold text-white">{usage?.connected_chats_count || 0}</span>
                <span className="text-xs text-slate-400">/ {currentSub?.plan_id?.max_connected_chats || 1} allowed</span>
              </div>
            </div>

            <div className="bg-slate-800/40 border border-slate-700/60 p-4 rounded-xl">
              <span className="text-xs text-slate-400 font-medium block">Verified Referrals (This Month)</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold text-emerald-400">{usage?.verified_referrals_count || 0}</span>
                <span className="text-xs text-slate-400">/ {(currentSub?.plan_id?.max_verified_referrals_monthly || 100).toLocaleString()} cap</span>
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
                className={`bg-slate-900 rounded-2xl p-6 border flex flex-col justify-between transition-all relative ${
                  isCurrent
                    ? 'border-sky-500 shadow-xl shadow-sky-500/10'
                    : isPopular
                    ? 'border-amber-500/50 shadow-lg'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-[10px] uppercase px-3 py-0.5 rounded-full shadow">
                    Most Popular
                  </span>
                )}

                <div>
                  <h3 className="text-base font-bold text-white capitalize">{p.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{p.description}</p>

                  <div className="mt-4 mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-white">${price}</span>
                      <span className="text-xs text-slate-400">/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
                    </div>
                    {stars > 0 && (
                      <span className="text-xs text-amber-400 font-semibold block mt-0.5">
                        ⭐ {stars.toLocaleString()} Stars
                      </span>
                    )}
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-300 border-t border-slate-800 pt-4">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                      <span><strong>{p.max_active_campaigns}</strong> Active Campaigns</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                      <span><strong>{p.max_connected_chats}</strong> Connected Chats</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                      <span><strong>{p.max_verified_referrals_monthly.toLocaleString()}</strong> Referrals/mo</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                      <span>Anti-Fraud: <strong className="uppercase text-[10px]">{p.features.anti_fraud_tier}</strong></span>
                    </li>
                    {p.features.automated_rewards && (
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span>Automated Rewards Ledger</span>
                      </li>
                    )}
                    {p.features.custom_branding && (
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span>Custom Branding & Bot</span>
                      </li>
                    )}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-400 cursor-default"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(p.code)}
                      disabled={upgradingCode === p.code}
                      className="w-full py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-white shadow-lg shadow-sky-500/20 disabled:opacity-50 transition-all"
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
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-400" /> Invoices & Payment Receipts
          </h2>

          {invoices.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No payment invoices generated yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 rounded-l">Invoice Number</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Currency</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 rounded-r">Billing Period</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {invoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-3 font-mono font-semibold text-white">{inv.invoice_number}</td>
                      <td className="py-3 px-3 font-bold text-emerald-400">{inv.amount}</td>
                      <td className="py-3 px-3 uppercase text-[10px] text-slate-400">{inv.currency}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500">
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
