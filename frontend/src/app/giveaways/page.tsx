'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import {
  Gift,
  Sparkles,
  ShieldCheck,
  UserCheck,
  RefreshCw,
  ExternalLink,
  Users,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function GiveawaysPage() {
  const { activeWorkspace } = useAuth();

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [winners, setWinners] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Drawing Modal State
  const [showDrawModal, setShowDrawModal] = useState(false);
  const [winnerCount, setWinnerCount] = useState(1);
  const [drawMethod, setDrawMethod] = useState<'random' | 'weighted' | 'points'>('weighted');
  const [prizeDetails, setPrizeDetails] = useState('1,000 USDT Community Prize');
  const [drawingLoading, setDrawingLoading] = useState(false);

  // Replacement Modal State
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [selectedWinnerId, setSelectedWinnerId] = useState<string>('');
  const [replaceReason, setReplaceReason] = useState('Failed Telegram verification check');
  const [replacingLoading, setReplacingLoading] = useState(false);

  useEffect(() => {
    if (activeWorkspace) {
      api.getCampaigns().then((camps) => {
        const giveawayCamps = camps.filter((c: any) => c.type === 'giveaway' || c.type === 'hybrid');
        setCampaigns(giveawayCamps);
        if (giveawayCamps.length > 0) {
          setSelectedCampaignId(giveawayCamps[0]._id);
          loadGiveawayData(giveawayCamps[0]._id);
        } else {
          setLoading(false);
        }
      });
    }
  }, [activeWorkspace]);

  const loadGiveawayData = async (campaignId: string) => {
    setLoading(true);
    try {
      const [win, ent] = await Promise.all([
        api.getGiveawayWinners(campaignId),
        api.getGiveawayEntries(campaignId),
      ]);
      setWinners(win);
      setEntries(ent.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCampaignChange = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    loadGiveawayData(campaignId);
  };

  const handleDrawWinners = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaignId) return;

    setDrawingLoading(true);
    try {
      await api.drawGiveawayWinners(selectedCampaignId, {
        winner_count: Number(winnerCount),
        method: drawMethod,
        prize_details: prizeDetails,
      });
      setShowDrawModal(false);
      await loadGiveawayData(selectedCampaignId);
    } catch (err: any) {
      alert(err.message || 'Drawing failed');
    } finally {
      setDrawingLoading(false);
    }
  };

  const handleReplaceWinner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWinnerId || !replaceReason) return;

    setReplacingLoading(true);
    try {
      await api.replaceWinner(selectedWinnerId, replaceReason);
      setShowReplaceModal(false);
      await loadGiveawayData(selectedCampaignId);
    } catch (err: any) {
      alert(err.message || 'Replacement failed');
    } finally {
      setReplacingLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Provably-Fair Giveaways & Raffles</h1>
            <p className="text-sm text-slate-400 mt-1">
              Cryptographically secure random draws, referral-weighted tickets, and auditable proof seeds.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {campaigns.length > 0 && (
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
            )}

            {selectedCampaignId && (
              <button
                onClick={() => setShowDrawModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-xs font-semibold text-white shadow-lg shadow-orange-500/20"
              >
                <Sparkles className="w-4 h-4" /> Draw Winners
              </button>
            )}
          </div>
        </div>

        {/* Winners Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-400" /> Recorded Winners & Cryptographic Proof
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Provable fairness verification available for each winner draw.
              </p>
            </div>

            {selectedCampaignId && (
              <Link
                href={`/public/giveaway/${selectedCampaignId}`}
                target="_blank"
                className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold"
              >
                Public Transparency View <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {winners.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No winners drawn yet for this campaign. Click "Draw Winners" to execute provably-fair selection.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 rounded-l">Rank</th>
                    <th className="py-2.5 px-3">Winner Telegram ID</th>
                    <th className="py-2.5 px-3">Prize Details</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Audit Hash</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 rounded-r text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {winners.map((w) => (
                    <tr key={w._id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-3 font-bold text-amber-400">#{w.rank}</td>
                      <td className="py-3 px-3 font-mono text-sky-400 font-semibold">{w.user_telegram_id}</td>
                      <td className="py-3 px-3 text-white font-medium">{w.prize_details}</td>
                      <td className="py-3 px-3 uppercase text-[10px] text-slate-400">{w.selected_method}</td>
                      <td className="py-3 px-3 font-mono text-slate-400 text-[10px]">
                        {w.audit_hash.slice(0, 16)}...
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            w.status === 'selected' || w.status === 'claimed'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {w.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {w.status === 'selected' && (
                          <button
                            onClick={() => {
                              setSelectedWinnerId(w._id);
                              setShowReplaceModal(true);
                            }}
                            className="text-[11px] text-rose-400 hover:text-rose-300 font-medium inline-flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" /> Disqualify & Replace
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Draw Winners */}
        {showDrawModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" /> Provably-Fair Winner Drawing
              </h3>
              <p className="text-xs text-slate-400">
                A cryptographically secure seed will be generated to randomly select winners from the eligible participant pool.
              </p>

              <form onSubmit={handleDrawWinners} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Number of Winners</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={winnerCount}
                    onChange={(e) => setWinnerCount(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Selection Algorithm</label>
                  <select
                    value={drawMethod}
                    onChange={(e) => setDrawMethod(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="weighted">Referral-Weighted (More verified referrals = More tickets)</option>
                    <option value="random">Pure Random (1 ticket per eligible participant)</option>
                    <option value="points">Points-Based</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Prize Description</label>
                  <input
                    type="text"
                    required
                    value={prizeDetails}
                    onChange={(e) => setPrizeDetails(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDrawModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-700 text-xs font-semibold text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={drawingLoading}
                    className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-semibold text-white shadow-lg shadow-amber-500/20 disabled:opacity-50"
                  >
                    {drawingLoading ? 'Executing Drawing...' : 'Execute Provable Draw'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Replace Winner */}
        {showReplaceModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-rose-400" /> Disqualify & Draw Replacement
              </h3>
              <p className="text-xs text-slate-400">
                This will mark the current winner as disqualified with an audit reason and immediately draw a replacement from remaining eligible participants.
              </p>

              <form onSubmit={handleReplaceWinner} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Disqualification Reason *</label>
                  <textarea
                    rows={3}
                    required
                    value={replaceReason}
                    onChange={(e) => setReplaceReason(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-white"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReplaceModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-700 text-xs font-semibold text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={replacingLoading}
                    className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-lg shadow-rose-600/20 disabled:opacity-50"
                  >
                    {replacingLoading ? 'Drawing Replacement...' : 'Confirm Replacement'}
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
