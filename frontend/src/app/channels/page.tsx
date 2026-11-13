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
      <div className="space-y-8 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Connected Telegram Chats & Bots</h1>
          <p className="text-sm text-slate-400 mt-1">
            Authorize public/private channels and supergroups to generate verified invite links.
          </p>
        </div>

        {statusMessage && (
          <div
            className={`p-4 rounded-xl border text-xs font-medium flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {statusMessage.text}
          </div>
        )}

        {/* Step-by-step Connection Guide */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white mb-3">How to Connect a Telegram Channel or Group:</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-800/50 border border-slate-700/60 p-4 rounded-lg">
              <span className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center mb-2">1</span>
              <p className="font-semibold text-white">Add Central SaaS Bot</p>
              <p className="text-slate-400 mt-1">
                Add <span className="text-sky-300 font-mono">@tg_ref_saas_bot</span> as an <strong>Administrator</strong> to your Telegram Channel or Supergroup.
              </p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700/60 p-4 rounded-lg">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center mb-2">2</span>
              <p className="font-semibold text-white">Grant "Invite Users" Permission</p>
              <p className="text-slate-400 mt-1">
                Enable <strong>"Invite Users via Link"</strong> (can_invite_users) so the bot can generate individual referral links.
              </p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700/60 p-4 rounded-lg">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center mb-2">3</span>
              <p className="font-semibold text-white">Enter Chat ID to Verify</p>
              <p className="text-slate-400 mt-1">
                Enter your Telegram Chat ID (e.g. <span className="font-mono text-slate-300">-1001234567890</span>) or channel username below and click <strong>Verify</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Connect Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Channel Connection */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-sky-400" /> Verify Channel Connection
            </h2>

            <form onSubmit={handleVerifyChat} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Telegram Chat ID</label>
                <input
                  type="text"
                  required
                  placeholder="-1001987654321 or @my_channel"
                  value={chatIdInput}
                  onChange={(e) => setChatIdInput(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-white shadow-lg shadow-sky-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                {loading ? 'Verifying Permissions...' : 'Verify Chat Connection'}
              </button>
            </form>
          </div>

          {/* Custom Creator Bot */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Bot className="w-4 h-4 text-emerald-400" /> Custom Creator Bot (Optional)
            </h2>
            <p className="text-xs text-slate-400">
              White-label the platform under your own brand using your BotFather token. Encrypted with AES-256-GCM.
            </p>

            <form onSubmit={handleConnectCustomBot} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">BotFather Bot Token</label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="123456789:ABCdefGhIjklMnOpQrStUvWxYz"
                    value={customTokenInput}
                    onChange={(e) => setCustomTokenInput(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 pl-9"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={customLoading}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all"
              >
                {customLoading ? 'Verifying Token...' : 'Connect & Encrypt Custom Bot'}
              </button>
            </form>
          </div>
        </div>

        {/* Connected Chats Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white">Your Verified Channels & Groups ({chats.length})</h2>

          {chats.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              No channels verified yet. Follow the 3-step guide above to connect your first channel.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 rounded-l">Chat Title</th>
                    <th className="py-2.5 px-3">Chat ID</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Invite Permission</th>
                    <th className="py-2.5 px-3 rounded-r">Last Verified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {chats.map((c) => (
                    <tr key={c._id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-3 font-semibold text-white">{c.title}</td>
                      <td className="py-3 px-3 font-mono text-slate-400">{c.chat_id}</td>
                      <td className="py-3 px-3 uppercase text-[10px] text-slate-400">{c.type}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {c.verification_status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-emerald-400 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> can_invite_users
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500">
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
