'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import {
  Radio,
  CheckCircle2,
  AlertTriangle,
  Bot,
  Plus,
  ShieldCheck,
  ExternalLink,
  Lock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export default function ChannelsPage() {
  const { activeWorkspace } = useAuth();

  const [chats, setChats] = useState<any[]>([]);
  const [chatIdInput, setChatIdInput] = useState('');
  const [customTokenInput, setCustomTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [customLoading, setCustomLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (activeWorkspace) {
      loadChats();
    }
  }, [activeWorkspace]);

  const loadChats = async () => {
    try {
      const data = await api.getWorkspaceChats(activeWorkspace!._id);
      setChats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerifyChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatIdInput) return;

    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await api.verifyChat(activeWorkspace!._id, chatIdInput);
      setStatusMessage({
        type: 'success',
        text: `Successfully verified chat "${res.title}" with required invite permissions!`,
      });
      setChatIdInput('');
      await loadChats();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to verify chat. Ensure the bot is added as Administrator with "Invite Users via Link".',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectCustomBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTokenInput) return;

    setCustomLoading(true);
    try {
      const res = await api.connectCustomBot(activeWorkspace!._id, customTokenInput);
      setStatusMessage({
        type: 'success',
        text: `Custom bot @${res.bot.bot_username} verified and securely encrypted with AES-256-GCM.`,
      });
      setCustomTokenInput('');
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to connect custom bot.',
      });
    } finally {
      setCustomLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl pb-12">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <span>Connected Telegram Chats & Bots</span>
            <span className="text-xs font-bold text-electric bg-electric/10 px-2 py-0.5 rounded-full border border-electric/20 font-mono">
              {chats.length} Verified
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Authorize public/private channels and supergroups to generate verified invite links.
          </p>
        </div>

        {statusMessage && (
          <div
            className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-2.5 shadow-sm ${
              statusMessage.type === 'success'
                ? 'bg-successGreen/10 border-successGreen/30 text-successGreen'
                : 'bg-dangerRed/10 border-dangerRed/30 text-dangerRed'
            }`}
          >
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Step-by-step Connection Guide */}
        <div className="bg-navy-800/90 border border-navy-700/80 rounded-2xl p-6 shadow-card">
          <h2 className="text-sm font-bold text-white mb-3.5 flex items-center gap-2">
            <Radio className="w-4 h-4 text-electric" /> How to Connect a Telegram Channel or Group:
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-navy-900/70 border border-navy-700/70 p-4 rounded-xl space-y-1.5">
              <span className="w-6 h-6 rounded-lg bg-electric/20 text-electric font-bold text-xs flex items-center justify-center">
                1
              </span>
              <p className="font-bold text-white">Add Central Telegram Bot</p>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Add <span className="text-cyanAccent font-mono font-bold">@TeleGrowthnxbot</span> as an <strong>Administrator</strong> to your Telegram Channel or Supergroup.
              </p>
            </div>

            <div className="bg-navy-900/70 border border-navy-700/70 p-4 rounded-xl space-y-1.5">
              <span className="w-6 h-6 rounded-lg bg-successGreen/20 text-successGreen font-bold text-xs flex items-center justify-center">
                2
              </span>
              <p className="font-bold text-white">Grant "Invite Users" Permission</p>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Enable <strong>"Invite Users via Link"</strong> (can_invite_users) so the bot can generate individual referral links.
              </p>
            </div>

            <div className="bg-navy-900/70 border border-navy-700/70 p-4 rounded-xl space-y-1.5">
              <span className="w-6 h-6 rounded-lg bg-warningOrange/20 text-warningOrange font-bold text-xs flex items-center justify-center">
                3
              </span>
              <p className="font-bold text-white">Enter Chat ID to Verify</p>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Enter your Telegram Chat ID (e.g. <span className="font-mono text-slate-300">-1001234567890</span>) or username below and click <strong>Verify</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Connect Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Channel Connection */}
          <div className="bg-navy-800/90 border border-navy-700/80 rounded-2xl p-6 space-y-4 shadow-card">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-electric" /> Verify Channel Connection
            </h2>

            <form onSubmit={handleVerifyChat} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                  Telegram Chat ID or Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="-1001987654321 or @my_channel"
                  value={chatIdInput}
                  onChange={(e) => setChatIdInput(e.target.value)}
                  className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-electric hover:bg-electric-hover text-xs font-bold text-white shadow-lg shadow-electric/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{loading ? 'Verifying Permissions...' : 'Verify Chat Connection'}</span>
              </button>
            </form>
          </div>

          {/* Custom Creator Bot */}
          <div className="bg-navy-800/90 border border-navy-700/80 rounded-2xl p-6 space-y-4 shadow-card">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Bot className="w-4 h-4 text-cyanAccent" /> Custom Creator Bot (Optional)
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              White-label the platform under your own brand using your BotFather token. Encrypted with AES-256-GCM.
            </p>

            <form onSubmit={handleConnectCustomBot} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                  BotFather Bot Token
                </label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="123456789:ABCdefGhIjklMnOpQrStUvWxYz"
                    value={customTokenInput}
                    onChange={(e) => setCustomTokenInput(e.target.value)}
                    className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyanAccent focus:ring-1 focus:ring-cyanAccent pl-10 transition-colors"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                </div>
              </div>

              <button
                type="submit"
                disabled={customLoading}
                className="w-full py-2.5 rounded-xl bg-navy-750 hover:bg-navy-700 border border-navy-650 text-xs font-bold text-cyanAccent shadow-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
              >
                <span>{customLoading ? 'Verifying Token...' : 'Connect & Encrypt Custom Bot'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Connected Chats Table */}
        <div className="bg-navy-800/90 border border-navy-700/80 rounded-2xl p-6 space-y-4 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Your Verified Channels & Groups</h2>
            <span className="text-xs text-slate-400 font-mono">{chats.length} active</span>
          </div>

          {chats.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 space-y-2">
              <Radio className="w-8 h-8 mx-auto text-slate-600" />
              <p className="font-semibold text-slate-400">No channels verified yet.</p>
              <p className="text-[11px]">Follow the 3-step setup guide above to verify your first Telegram channel or group.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-navy-900/60 text-slate-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 rounded-l-xl">Chat Title</th>
                    <th className="py-2.5 px-3">Chat ID</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Invite Permission</th>
                    <th className="py-2.5 px-3 rounded-r-xl">Last Verified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700/60">
                  {chats.map((c) => (
                    <tr key={c._id} className="hover:bg-navy-750/40 transition-colors">
                      <td className="py-3 px-3 font-bold text-white">{c.title}</td>
                      <td className="py-3 px-3 font-mono text-slate-400">{c.chat_id}</td>
                      <td className="py-3 px-3 uppercase text-[10px] font-bold text-slate-400">{c.type}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-successGreen/15 text-successGreen border border-successGreen/30">
                          {c.verification_status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-successGreen flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> can_invite_users
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                        {new Date(c.last_verified_at).toLocaleDateString()}
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
