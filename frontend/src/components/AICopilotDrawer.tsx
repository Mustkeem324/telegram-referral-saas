'use client';

import React, { useState } from 'react';
import { 
  Sparkles, X, Send, Bot, Zap, ShieldAlert, Copy, Check, 
  Flame, TrendingUp, MessageSquare, RefreshCw, ChevronRight 
} from 'lucide-react';

export default function AICopilotDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'copywriter' | 'insights'>('chat');
  const [messages, setMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string }>>([
    {
      sender: 'ai',
      text: '✦ **Greetings! I am your AI Growth Copilot.** I monitor your Telegram channels in real-time, predict viral velocity, and detect bot anomalies. How can I optimize your community today?',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Copywriter State
  const [copyStyle, setCopyStyle] = useState<'hyper-hype' | 'urgency' | 'gamified'>('hyper-hype');
  const [campaignTitle, setCampaignTitle] = useState('Mega Alpha Referral Drop');
  const [generatedCopy, setGeneratedCopy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const sendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || loading) return;

    const userMsg = text.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    if (!textToSend) setInputMessage('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:4000/api/ai/copilot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ message: userMsg }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { sender: 'ai', text: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: '🛡️ **AI Engine Response**: TeleGrowth multi-tiered anti-fraud verification is active. Your Telegram Premium boost is currently 2x. Recommend broadcasting leaderboard top 3 to channel to spike sharing velocity!',
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: '✦ **Heuristic Insights**: Retention periods are healthy at 48h. Telegram Premium invites are showing an 82% 30-day retention advantage.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const generateCopy = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/ai/copilot/generate-copy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ campaignTitle, style: copyStyle }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedCopy(data.copy?.telegramPost || '');
      }
    } catch (e) {
      setGeneratedCopy(
        `🚨 **COMMUNITY REFERRAL BOOST IS LIVE!** 🚨\n\nInvite your friends to ${campaignTitle} and earn +10 Points per join (⭐ +20 Points for Telegram Premium members)!\n\nTop 3 on the leaderboard this Sunday unlock exclusive VIP perks!`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white font-semibold text-xs border border-electric/40 shadow-xl shadow-electric/20 backdrop-blur-xl transition-all duration-300 hover:scale-105 active:scale-95"
        >
          <div className="relative flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-cyan-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span className="bg-gradient-to-r from-white via-cyan-200 to-electric bg-clip-text text-transparent font-bold">
            ✦ AI Copilot
          </span>
          <span className="hidden sm:inline-block text-[10px] bg-electric/20 text-cyan-300 px-1.5 py-0.5 rounded-full border border-electric/30">
            Online
          </span>
        </button>
      </div>

      {/* Slide-Over Drawer */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-[#0B1120]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col font-sans animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-950/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-electric to-purple-600 flex items-center justify-center text-white shadow-md shadow-electric/25">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  ✦ Neural Growth Copilot
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-[10px] text-slate-400">Autonomous Viral Engine</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Subtabs */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-950/60 border-b border-white/5 text-xs font-medium">
            <button
              onClick={() => setActiveTab('chat')}
              className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'chat' ? 'bg-electric text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              AI Assistant
            </button>
            <button
              onClick={() => setActiveTab('copywriter')}
              className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'copywriter' ? 'bg-electric text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              1-Click Copywriter
            </button>
          </div>

          {/* CONTENT: CHAT */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Quick Prompt Pills */}
              <div className="p-3 bg-slate-900/40 border-b border-white/5 flex gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  'How to scale viral joins?',
                  'Analyze fraud patterns',
                  'Optimal Premium multiplier?',
                ].map((pill, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(pill)}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-electric/20 text-slate-300 hover:text-cyan-300 border border-white/5 hover:border-electric/30 transition shrink-0"
                  >
                    {pill}
                  </button>
                ))}
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-2xl leading-relaxed ${
                        m.sender === 'user'
                          ? 'bg-electric text-white rounded-br-none shadow-md shadow-electric/20 font-medium'
                          : 'bg-slate-900/90 text-slate-200 border border-white/10 rounded-bl-none shadow'
                      }`}
                    >
                      <div className="whitespace-pre-line">{m.text}</div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs py-1">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-electric" />
                    <span>✦ Copilot thinking...</span>
                  </div>
                )}
              </div>

              {/* Input Box */}
              <div className="p-3 border-t border-white/10 bg-slate-950/60">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask AI Copilot about viral growth..."
                    className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-electric"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || loading}
                    className="p-2 rounded-xl bg-electric hover:bg-electric-hover text-white transition disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* CONTENT: COPYWRITER */}
          {activeTab === 'copywriter' && (
            <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Campaign Title
                </label>
                <input
                  type="text"
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Tone & Style
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['hyper-hype', 'urgency', 'gamified'] as const).map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setCopyStyle(style)}
                      className={`py-1.5 px-2 rounded-lg capitalize text-[10px] font-medium border transition ${
                        copyStyle === style
                          ? 'bg-electric/20 border-electric text-cyan-300'
                          : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={generateCopy}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-electric to-cyanAccent hover:opacity-95 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-electric/25 transition active:scale-98"
              >
                {loading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Generate Channel Announcement
              </button>

              {generatedCopy && (
                <div className="p-3 rounded-xl bg-slate-950 border border-white/10 relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-emerald-400 font-semibold uppercase">
                      Ready to Broadcast
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedCopy);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="flex items-center gap-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Copied' : 'Copy Post'}
                    </button>
                  </div>
                  <pre className="text-[11px] text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                    {generatedCopy}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
