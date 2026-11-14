'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import {
  Award,
  Plus,
  Key,
  Shield,
  Upload,
  History,
  CheckCircle2,
  Lock,
  Sparkles,
  Layers,
  ChevronRight,
} from 'lucide-react';

export default function RewardsPage() {
  const { activeWorkspace } = useAuth();

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [rewards, setRewards] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload Inventory Modal
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [inventoryInput, setInventoryInput] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (activeWorkspace) {
      api.getCampaigns().then((camps) => {
        setCampaigns(camps);
        if (camps.length > 0) {
          setSelectedCampaignId(camps[0]._id);
          loadCampaignRewards(camps[0]._id);
        } else {
          setLoading(false);
        }
      });
    }
  }, [activeWorkspace]);

  const loadCampaignRewards = async (campaignId: string) => {
    setLoading(true);
    try {
      const [rew, led] = await Promise.all([
        api.getCampaignRewards(campaignId),
        api.getRewardLedger(campaignId),
      ]);
      setRewards(rew);
      setLedger(led.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCampaignChange = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    loadCampaignRewards(campaignId);
  };

  const handleUploadInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReward || !inventoryInput) return;

    const codes = inventoryInput
      .split('\n')
      .map((c) => c.trim())
      .filter(Boolean);

    try {
      await api.uploadInventory(selectedReward._id, codes);
      setUploadSuccess(`Successfully added ${codes.length} keys/codes to reward "${selectedReward.name}".`);
      setInventoryInput('');
      setTimeout(() => {
        setUploadSuccess(null);
        setShowInventoryModal(false);
      }, 2000);
      loadCampaignRewards(selectedCampaignId);
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <span>Milestone Rewards & Ledger</span>
              <span className="text-xs font-bold text-warningOrange bg-warningOrange/10 px-2.5 py-0.5 rounded-full border border-warningOrange/25">
                Ledger Backed
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Cryptographically verified reward distribution with immutable transaction audit logs.
            </p>
          </div>

          {campaigns.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider text-[11px]">Campaign:</span>
              <select
                value={selectedCampaignId}
                onChange={(e) => handleCampaignChange(e.target.value)}
                className="bg-navy-800 border border-navy-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-electric"
              >
                {campaigns.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Milestone Rewards Cards */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-warningOrange" /> Configured Milestone Rewards
          </h2>

          {rewards.length === 0 ? (
            <div className="p-8 rounded-2xl bg-navy-800/80 border border-navy-700/80 text-center text-xs text-slate-400 space-y-2">
              <Award className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="font-semibold text-slate-300">No rewards configured for this campaign yet.</p>
              <p className="text-[11px] text-slate-500">You can define milestone bonuses during campaign creation or editing.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {rewards.map((r) => (
                <div key={r._id} className="bg-navy-800/90 border border-navy-700/80 rounded-2xl p-5 shadow-card flex flex-col justify-between hover:border-navy-650 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-warningOrange/15 text-warningOrange border border-warningOrange/30">
                        {r.milestone_referrals_required} Referrals Req.
                      </span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                        r.type === 'telegram_premium'
                          ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                          : r.type === 'telegram_stars'
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : 'bg-cyanAccent/10 text-cyanAccent border-cyanAccent/20'
                      }`}>
                        {r.type === 'telegram_premium' ? '⭐ Telegram Premium' : r.type === 'telegram_stars' ? '⭐ Telegram Stars' : r.type}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white">{r.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{r.description || 'Automatic milestone reward unlock.'}</p>

                    <div className="mt-4 pt-3.5 border-t border-navy-700/80 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Inventory:</span>
                      <span className="font-bold text-white font-mono">
                        {r.requires_inventory ? `${r.total_inventory - r.claimed_count} remaining` : 'Automatic Digital'}
                      </span>
                    </div>
                  </div>

                  {r.requires_inventory && (
                    <button
                      onClick={() => {
                        setSelectedReward(r);
                        setShowInventoryModal(true);
                      }}
                      className="mt-4 w-full py-2.5 rounded-xl bg-navy-750 hover:bg-navy-700 border border-navy-650 text-xs font-bold text-electric flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Codes / Keys</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Append-only Ledger Table */}
        <div className="bg-navy-800/90 border border-navy-700/80 rounded-2xl p-6 space-y-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-electric" /> Reward Transactions Ledger
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Every credit and reversal is stamped with an immutable SHA-256 integrity hash.
              </p>
            </div>
          </div>

          {ledger.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No reward transactions recorded yet for this campaign.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-navy-900/60 text-slate-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 rounded-l-xl">Transaction Hash</th>
                    <th className="py-2.5 px-3">Beneficiary</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3 rounded-r-xl">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700/60">
                  {ledger.map((tx) => (
                    <tr key={tx._id} className="hover:bg-navy-750/40 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                        {tx.transaction_hash.slice(0, 16)}...
                      </td>
                      <td className="py-3 px-3 font-mono text-electric font-semibold">{tx.user_telegram_id}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            tx.type === 'credit'
                              ? 'bg-successGreen/15 text-successGreen border border-successGreen/30'
                              : 'bg-dangerRed/15 text-dangerRed border border-dangerRed/30'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-white font-mono">
                        {tx.type === 'credit' ? '+' : '-'}{tx.amount} {tx.unit}
                      </td>
                      <td className="py-3 px-3 text-slate-300 max-w-xs truncate">{tx.reason}</td>
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Upload Inventory */}
        {showInventoryModal && (
          <div className="fixed inset-0 z-50 bg-navy-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-navy-800 border border-navy-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
              <h3 className="text-base font-bold text-white">
                Upload Keys / Codes for "{selectedReward?.name}"
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Paste unique promo codes, software licenses, or secret links (one per line). Each will be dispensed once to verified achievers.
              </p>

              {uploadSuccess && (
                <div className="p-3.5 rounded-xl bg-successGreen/10 border border-successGreen/30 text-successGreen text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> {uploadSuccess}
                </div>
              )}

              <form onSubmit={handleUploadInventory} className="space-y-4">
                <textarea
                  rows={6}
                  required
                  placeholder={"KEY-XXXX-1111\nKEY-YYYY-2222\nKEY-ZZZZ-3333"}
                  value={inventoryInput}
                  onChange={(e) => setInventoryInput(e.target.value)}
                  className="w-full bg-navy-900 border border-navy-700 rounded-xl p-3.5 text-xs font-mono text-white focus:outline-none focus:border-electric"
                />

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInventoryModal(false)}
                    className="px-4 py-2 rounded-xl border border-navy-700 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-electric hover:bg-electric-hover text-xs font-bold text-white shadow-lg shadow-electric/25 transition-all"
                  >
                    Upload Inventory
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
