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
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Milestone Rewards & Immutable Ledger</h1>
            <p className="text-sm text-slate-400 mt-1">
              Ledger-based reward distribution accounting. Historical transactions cannot be silently modified.
            </p>
          </div>

          {campaigns.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Filter by Campaign:</span>
              <select
                value={selectedCampaignId}
                onChange={(e) => handleCampaignChange(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
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
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" /> Configured Milestone Rewards
          </h2>

          {rewards.length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-500">
              No rewards configured for this campaign. You can add rewards when editing or creating a campaign.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {rewards.map((r) => (
                <div key={r._id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {r.milestone_referrals_required} Referrals Req.
                      </span>
                      <span className="text-xs uppercase text-slate-500 font-semibold">{r.type}</span>
                    </div>

                    <h3 className="text-sm font-semibold text-white">{r.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{r.description || 'Automatic milestone unlock.'}</p>

                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Inventory Status:</span>
                      <span className="font-semibold text-white">
                        {r.requires_inventory ? `${r.total_inventory - r.claimed_count} remaining` : 'Digital Automatic'}
                      </span>
                    </div>
                  </div>

                  {r.requires_inventory && (
                    <button
                      onClick={() => {
                        setSelectedReward(r);
                        setShowInventoryModal(true);
                      }}
                      className="mt-4 w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-sky-400 flex items-center justify-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload Codes / Keys
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Append-only Ledger Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-sky-400" /> Reward Transactions Ledger
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Every credit and reversal is stamped with an immutable SHA-256 integrity hash.
              </p>
            </div>
          </div>

          {ledger.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No reward transactions recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 rounded-l">Transaction Hash</th>
                    <th className="py-2.5 px-3">Beneficiary</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3 rounded-r">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {ledger.map((tx) => (
                    <tr key={tx._id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                        {tx.transaction_hash.slice(0, 16)}...
                      </td>
                      <td className="py-3 px-3 font-mono text-sky-400">{tx.user_telegram_id}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            tx.type === 'credit'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-white">
                        {tx.type === 'credit' ? '+' : '-'}{tx.amount} {tx.unit}
                      </td>
                      <td className="py-3 px-3 text-slate-300 max-w-xs truncate">{tx.reason}</td>
                      <td className="py-3 px-3 text-slate-500">
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
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
              <h3 className="text-base font-bold text-white">
                Upload Keys / Codes for "{selectedReward?.name}"
              </h3>
              <p className="text-xs text-slate-400">
                Paste unique promo codes, software licenses, or secret links (one per line). Each will be dispensed once to verified achievers.
              </p>

              {uploadSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2">
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowInventoryModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-700 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-white shadow-lg shadow-sky-500/20"
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
