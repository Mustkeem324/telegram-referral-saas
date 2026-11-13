'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '../../../../lib/api';
import { Sparkles, ShieldCheck, Gift, CheckCircle, ExternalLink, Lock } from 'lucide-react';

export default function PublicGiveawayPage() {
  const { id } = useParams() as { id: string };

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      api.getPublicGiveaway(id)
        .then((res) => setData(res))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        Verifying cryptographic giveaway proof...
      </div>
    );
  }

  if (!data || !data.campaign) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-rose-400 text-xs">
        Giveaway campaign not found or not published.
      </div>
    );
  }

  const { campaign, winners } = data;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" /> Provably-Fair Audit Record
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">{campaign.title}</h1>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            This giveaway was drawn using cryptographically secure randomization. All proofs and seeds are publicly auditable below.
          </p>
        </div>

        {/* Winners List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Gift className="w-4 h-4 text-amber-400" /> Official Verified Winners ({winners.length})
          </h2>

          {winners.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No winners drawn yet. The drawing will be published once closed by campaign administrators.
            </div>
          ) : (
            <div className="space-y-3">
              {winners.map((w: any) => (
                <div key={w.rank} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center border border-amber-500/30">
                        #{w.rank}
                      </span>
                      <span className="text-sm font-bold text-white">{w.prize_details}</span>
                    </div>
                    <span className="text-xs font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 font-semibold">
                      {w.user_masked}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-700/40 text-[11px] font-mono text-slate-400 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">Audit Hash (SHA-256):</span>
                      <span className="text-slate-300 break-all">{w.audit_hash}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">Cryptographic Seed:</span>
                      <span className="text-slate-300 break-all">{w.crypto_seed}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-center text-xs text-slate-500 pt-4 border-t border-slate-900">
          Powered by <strong>TeleGrowth</strong> — Multi-Tenant Telegram Referral & Giveaway Platform
        </div>
      </div>
    </div>
  );
}
