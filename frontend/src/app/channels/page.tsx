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
  Activity,
  Zap,
  RefreshCw,
  Trash2,
  Check,
  Key,
} from 'lucide-react';

export default function ChannelsPage() {
  const { activeWorkspace } = useAuth();

  const [chats, setChats] = useState<any[]>([]);
  const [chatIdInput, setChatIdInput] = useState('');
  const [customTokenInput, setCustomTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [customLoading, setCustomLoading] = useState(false);
  const [testingBot, setTestingBot] = useState(false);
  const [disconnectingBot, setDisconnectingBot] = useState(false);
  const [customBot, setCustomBot] = useState<{ connected: boolean; bot?: any } | null>(null);
  const [pingResult, setPingResult] = useState<{ success: boolean; pingMs: number; botInfo?: any; isRunning?: boolean; error?: string } | null>(null);
  const [showTokenUpdate, setShowTokenUpdate] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (activeWorkspace) {
      loadChats();
      loadCustomBot();
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

  const loadCustomBot = async () => {
    try {
      const data = await api.getCustomBot(activeWorkspace!._id);
      setCustomBot(data);
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
    setStatusMessage(null);
    try {
      const res = await api.connectCustomBot(activeWorkspace!._id, customTokenInput);
      setStatusMessage({
        type: 'success',
        text: `Custom bot @${res.bot.bot_username} verified, encrypted with AES-256-GCM, and polling daemon started!`,
      });
      setCustomTokenInput('');
      setShowTokenUpdate(false);
      await loadCustomBot();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to connect custom bot.',
      });
    } finally {
      setCustomLoading(false);
    }
  };

  const handleTestCustomBot = async () => {
    setTestingBot(true);
    setPingResult(null);
    try {
      const res = await api.testCustomBot(activeWorkspace!._id);
      setPingResult(res);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Diagnostic ping successful (${res.pingMs}ms)! Custom bot @${res.botInfo?.username} is active and polling.`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: `Diagnostic check failed: ${res.error || 'Custom bot API unreachable'}`,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Diagnostic ping failed.',
      });
    } finally {
      setTestingBot(false);
      await loadCustomBot();
    }
  };

  const handleDisconnectCustomBot = async () => {
    if (!confirm('Are you sure you want to disconnect your custom bot? Its background polling listener will be stopped.')) {
      return;
    }

    setDisconnectingBot(true);
    try {
      await api.disconnectCustomBot(activeWorkspace!._id);
      setStatusMessage({
        type: 'success',
        text: 'Custom bot disconnected and polling daemon stopped successfully.',
      });
      setCustomBot({ connected: false });
      setPingResult(null);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to disconnect custom bot.',
      });
    } finally {
      setDisconnectingBot(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl pb-12">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span>Connected Telegram Chats & Bots</span>
            <span className="text-xs font-bold text-electric bg-electric/10 px-2 py-0.5 rounded-full border border-electric/20 font-mono">
              {chats.length} Verified
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Authorize public/private channels and configure your custom branded Telegram bot daemon.
          </p>
        </div>

        {statusMessage && (
          <div
            className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-2.5 shadow-sm ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-successGreen/10 border-emerald-200 dark:border-successGreen/30 text-emerald-800 dark:text-successGreen'
                : 'bg-rose-50 dark:bg-dangerRed/10 border-rose-200 dark:border-dangerRed/30 text-rose-800 dark:text-dangerRed'
            }`}
          >
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Custom Creator Bot Engine */}
        <div className="bg-white dark:bg-navy-800/90 border border-slate-200 dark:border-navy-700/80 rounded-2xl p-6 space-y-5 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-navy-700/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyanAccent/10 text-cyan-600 dark:text-cyanAccent border border-cyan-200 dark:border-cyanAccent/30 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Custom Branded Telegram Bot</span>
                  {customBot?.connected && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-successGreen/15 text-emerald-700 dark:text-successGreen border border-emerald-200 dark:border-successGreen/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-successGreen animate-pulse"></span>
                      Live & Polling
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  White-label TeleGrowth under your own community bot name and avatar. Powered by AES-256-GCM encryption.
                </p>
              </div>
            </div>

            {customBot?.connected && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestCustomBot}
                  disabled={testingBot}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-navy-750 dark:hover:bg-navy-700 border border-slate-200 dark:border-navy-650 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Activity className={`w-3.5 h-3.5 text-cyan-600 dark:text-cyanAccent ${testingBot ? 'animate-spin' : ''}`} />
                  <span>{testingBot ? 'Pinging API...' : 'Ping Test'}</span>
                </button>

                <a
                  href={`https://t.me/${customBot.bot?.bot_username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-electric hover:bg-electric-hover text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <span>Open Bot</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {customBot?.connected && customBot.bot ? (
            <div className="space-y-4">
              {/* Bot Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-slate-50 dark:bg-navy-900/70 border border-slate-200 dark:border-navy-700/70 p-3.5 rounded-xl">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Bot Identity</p>
                  <p className="text-xs font-extrabold text-slate-900 dark:text-white mt-1">
                    {customBot.bot.first_name || 'Creator Bot'}
                  </p>
                  <p className="text-[11px] font-mono text-cyan-600 dark:text-cyanAccent">@{customBot.bot.bot_username}</p>
                </div>

                <div className="bg-slate-50 dark:bg-navy-900/70 border border-slate-200 dark:border-navy-700/70 p-3.5 rounded-xl">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Telegram Bot ID</p>
                  <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-1">
                    {customBot.bot.bot_id}
                  </p>
                  <span className="text-[10px] text-slate-400">BotFather registered</span>
                </div>

                <div className="bg-slate-50 dark:bg-navy-900/70 border border-slate-200 dark:border-navy-700/70 p-3.5 rounded-xl">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Polling Daemon</p>
                  <p className="text-xs font-bold text-emerald-600 dark:text-successGreen mt-1 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Multi-Tenant Active</span>
                  </p>
                  <span className="text-[10px] text-slate-400">Listens for /link & joins</span>
                </div>

                <div className="bg-slate-50 dark:bg-navy-900/70 border border-slate-200 dark:border-navy-700/70 p-3.5 rounded-xl">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Security Encryption</p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyanAccent" />
                    <span>AES-256-GCM</span>
                  </p>
                  <span className="text-[10px] text-slate-400">Zero plain-text storage</span>
                </div>
              </div>

              {/* Ping Diagnostic Output */}
              {pingResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                    pingResult.success
                      ? 'bg-cyan-50/50 dark:bg-cyanAccent/5 border-cyan-200 dark:border-cyanAccent/25 text-slate-800 dark:text-slate-200'
                      : 'bg-rose-50 dark:bg-dangerRed/10 border-rose-200 dark:border-dangerRed/30 text-rose-800 dark:text-dangerRed'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-cyan-600 dark:text-cyanAccent" />
                      Diagnostic Health Status: {pingResult.success ? 'Operational' : 'Error'}
                    </span>
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700">
                      ⚡ {pingResult.pingMs}ms latency
                    </span>
                  </div>
                  {pingResult.success && pingResult.botInfo && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Telegram API confirmed valid permissions. Bot supports group joins: <strong>{pingResult.botInfo.can_join_groups ? 'Yes' : 'No'}</strong>.
                    </p>
                  )}
                  {pingResult.error && (
                    <p className="text-[11px] font-mono text-dangerRed">{pingResult.error}</p>
                  )}
                </div>
              )}

              {/* Bot Control Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTokenUpdate(!showTokenUpdate)}
                    className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-electric transition-colors flex items-center gap-1"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>{showTokenUpdate ? 'Cancel Token Update' : 'Update Bot Token'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleDisconnectCustomBot}
                  disabled={disconnectingBot}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-dangerRed/10 dark:hover:bg-dangerRed/20 text-rose-700 dark:text-dangerRed border border-rose-200 dark:border-dangerRed/30 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{disconnectingBot ? 'Stopping...' : 'Disconnect Custom Bot'}</span>
                </button>
              </div>

              {/* Optional Token Update Form */}
              {showTokenUpdate && (
                <form onSubmit={handleConnectCustomBot} className="p-4 rounded-xl bg-slate-50 dark:bg-navy-900/80 border border-slate-200 dark:border-navy-700/80 space-y-3">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                    Replace BotFather Token
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="password"
                      placeholder="123456789:ABCdefGhIjklMnOpQrStUvWxYz"
                      value={customTokenInput}
                      onChange={(e) => setCustomTokenInput(e.target.value)}
                      className="flex-1 bg-white dark:bg-navy-950 border border-slate-300 dark:border-navy-700 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 dark:focus:border-cyanAccent"
                    />
                    <button
                      type="submit"
                      disabled={customLoading}
                      className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 dark:bg-cyanAccent/20 dark:hover:bg-cyanAccent/30 dark:border dark:border-cyanAccent/40 text-xs font-bold text-white dark:text-cyanAccent shadow-sm transition-all flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${customLoading ? 'animate-spin' : ''}`} />
                      <span>{customLoading ? 'Restarting...' : 'Update & Restart'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
                <p className="leading-relaxed">
                  Connect your own custom Telegram bot created via <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-electric font-semibold hover:underline">@BotFather</a>.
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-md bg-electric/15 text-electric text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
                    <span>Open <strong>@BotFather</strong> in Telegram and type <code className="bg-slate-100 dark:bg-navy-900 px-1 py-0.5 rounded text-[10px]">/newbot</code>.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-md bg-electric/15 text-electric text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
                    <span>Choose your bot's display name and username (e.g. <code className="bg-slate-100 dark:bg-navy-900 px-1 py-0.5 rounded text-[10px]">@MyCommunityRefBot</code>).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-md bg-electric/15 text-electric text-[11px] font-bold flex items-center justify-center shrink-0">3</span>
                    <span>Copy the HTTP API Token and paste it below. TeleGrowth immediately spins up the bot listener!</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleConnectCustomBot} className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-navy-900/60 border border-slate-200 dark:border-navy-700/60">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1">
                    BotFather API Token
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      placeholder="123456789:ABCdefGhIjklMnOpQrStUvWxYz"
                      value={customTokenInput}
                      onChange={(e) => setCustomTokenInput(e.target.value)}
                      className="w-full bg-white dark:bg-navy-900 border border-slate-300 dark:border-navy-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 dark:focus:border-cyanAccent pl-10 transition-colors"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={customLoading}
                  className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 dark:bg-navy-750 dark:hover:bg-navy-700 border border-cyan-600 dark:border-navy-650 text-xs font-bold text-white dark:text-cyanAccent shadow-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Bot className="w-4 h-4" />
                  <span>{customLoading ? 'Verifying & Launching Daemon...' : 'Connect & Launch Custom Bot'}</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Step-by-step Channel Connection Guide */}
        <div className="bg-white dark:bg-navy-800/90 border border-slate-200 dark:border-navy-700/80 rounded-2xl p-6 shadow-card">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3.5 flex items-center gap-2">
            <Radio className="w-4 h-4 text-electric" /> How to Connect a Telegram Channel or Group:
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-50 dark:bg-navy-900/70 border border-slate-200 dark:border-navy-700/70 p-4 rounded-xl space-y-1.5">
              <span className="w-6 h-6 rounded-lg bg-electric/20 text-electric font-bold text-xs flex items-center justify-center">
                1
              </span>
              <p className="font-bold text-slate-900 dark:text-white">Add Telegram Bot as Admin</p>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                Add <span className="text-cyan-700 dark:text-cyanAccent font-mono font-bold">{customBot?.connected && customBot.bot ? `@${customBot.bot.bot_username}` : '@TeleGrowthnxbot'}</span> as an <strong>Administrator</strong> to your Channel or Supergroup.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-navy-900/70 border border-slate-200 dark:border-navy-700/70 p-4 rounded-xl space-y-1.5">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-successGreen font-bold text-xs flex items-center justify-center">
                2
              </span>
              <p className="font-bold text-slate-900 dark:text-white">Grant "Invite Users" Permission</p>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                Enable <strong>"Invite Users via Link"</strong> (can_invite_users) so the bot can generate cryptographic referral links.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-navy-900/70 border border-slate-200 dark:border-navy-700/70 p-4 rounded-xl space-y-1.5">
              <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-700 dark:text-warningOrange font-bold text-xs flex items-center justify-center">
                3
              </span>
              <p className="font-bold text-slate-900 dark:text-white">Enter Chat ID to Verify</p>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                Enter your Telegram Chat ID (e.g. <span className="font-mono text-slate-700 dark:text-slate-300">-1001234567890</span>) or username below and click <strong>Verify</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Channel Verification Form */}
        <div className="bg-white dark:bg-navy-800/90 border border-slate-200 dark:border-navy-700/80 rounded-2xl p-6 space-y-4 shadow-card">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-electric" /> Verify Channel Connection
          </h2>

          <form onSubmit={handleVerifyChat} className="space-y-3.5">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1">
                Telegram Chat ID or Username
              </label>
              <input
                type="text"
                required
                placeholder="-1001987654321 or @my_channel"
                value={chatIdInput}
                onChange={(e) => setChatIdInput(e.target.value)}
                className="w-full bg-slate-50 dark:bg-navy-900 border border-slate-300 dark:border-navy-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric transition-colors"
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

        {/* Connected Chats Table */}
        <div className="bg-white dark:bg-navy-800/90 border border-slate-200 dark:border-navy-700/80 rounded-2xl p-6 space-y-4 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Your Verified Channels & Groups</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{chats.length} active</span>
          </div>

          {chats.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 space-y-2">
              <Radio className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-600" />
              <p className="font-semibold text-slate-700 dark:text-slate-400">No channels verified yet.</p>
              <p className="text-[11px]">Follow the 3-step setup guide above to verify your first Telegram channel or group.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-navy-900/60 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 rounded-l-xl">Chat Title</th>
                    <th className="py-2.5 px-3">Chat ID</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Invite Permission</th>
                    <th className="py-2.5 px-3 rounded-r-xl">Last Verified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-navy-700/60">
                  {chats.map((c) => (
                    <tr key={c._id} className="hover:bg-slate-50 dark:hover:bg-navy-750/40 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{c.title}</td>
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">{c.chat_id}</td>
                      <td className="py-3 px-3 uppercase text-[10px] font-bold text-slate-500 dark:text-slate-400">{c.type}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-successGreen/15 text-emerald-700 dark:text-successGreen border border-emerald-200 dark:border-successGreen/30">
                          {c.verification_status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-emerald-700 dark:text-successGreen flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> can_invite_users
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
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
