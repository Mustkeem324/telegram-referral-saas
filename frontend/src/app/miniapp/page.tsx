'use client';

import React, { useState, useEffect } from 'react';
import Script from 'next/script';
import { 
  Sparkles, Gift, Share2, Copy, Check, Flame, Trophy, 
  ArrowUpRight, ShieldCheck, Zap, Star, RefreshCw 
} from 'lucide-react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  is_premium?: boolean;
  photo_url?: string;
}

interface GamificationProfile {
  telegramId: string;
  verifiedInvites: number;
  unopenedCount: number;
  progressToNextBox: {
    current: number;
    target: number;
    percent: number;
    invitesNeeded: number;
  };
  streakDays: number;
  recentLoot: Array<{
    _id: string;
    box_tier: string;
    reward_title: string;
    opened_at: string;
  }>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function TelegramMiniApp() {
  const [tgUser, setTgUser] = useState<TelegramUser | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [openingBox, setOpeningBox] = useState(false);
  const [openedLoot, setOpenedLoot] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string>('');
  const [botLink, setBotLink] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'invite' | 'vault' | 'ranks'>('invite');

  // Initialize Telegram WebApp
  useEffect(() => {
    const initTg = () => {
      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        tg.ready();
        tg.expand();
        if (tg.enableClosingConfirmation) {
          tg.enableClosingConfirmation();
        }

        const user = tg.initDataUnsafe?.user;
        if (user) {
          setTgUser(user);
          loadUserData(String(user.id));
        } else {
          // Fallback demo user for browser testing
          const demoUser = {
            id: 1951052299,
            first_name: 'Community Creator',
            username: 'telecreator',
            is_premium: true,
          };
          setTgUser(demoUser);
          loadUserData('1951052299');
        }
      } else {
        // Fallback for browser
        const demoUser = {
          id: 1951052299,
          first_name: 'Community Creator',
          username: 'telecreator',
          is_premium: true,
        };
        setTgUser(demoUser);
        loadUserData('1951052299');
      }
    };

    if (typeof window !== 'undefined') {
      if ((window as any).Telegram?.WebApp) {
        initTg();
      } else {
        const timer = setTimeout(initTg, 500);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const loadUserData = async (telegramId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/gamification/public-profile/${telegramId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setProfile(data.profile);
        }
      }

      // Format links
      setBotLink(`https://t.me/TeleGrowthnxbot?start=ref_${telegramId.slice(-6)}`);
      setInviteLink(`https://t.me/+join_ref_${telegramId.slice(-6)}`);
    } catch (err) {
      console.error('Error loading mini-app profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerHaptic = (style: 'light' | 'medium' | 'heavy' | 'success') => {
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.HapticFeedback) {
        if (style === 'success') {
          tg.HapticFeedback.notificationOccurred('success');
        } else {
          tg.HapticFeedback.impactOccurred(style);
        }
      }
    } catch (e) {
      // Haptics not supported in browser
    }
  };

  const copyToClipboard = (text: string) => {
    triggerHaptic('success');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareViaTelegram = () => {
    triggerHaptic('medium');
    const shareText = encodeURIComponent(`👋 Join our exclusive Telegram community with my referral link and claim starter points!`);
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(botLink)}&text=${shareText}`;

    const tg = (window as any).Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  };

  const handleOpenMysteryChest = async () => {
    if (!profile || profile.unopenedCount <= 0 || !tgUser) return;
    triggerHaptic('heavy');
    setOpeningBox(true);

    try {
      const res = await fetch(`${API_BASE}/gamification/public-open-box`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: String(tgUser.id) }),
      });

      const data = await res.json();
      if (data.success && data.box) {
        triggerHaptic('success');
        setOpenedLoot(data.box.reward_title);
        loadUserData(String(tgUser.id));
      }
    } catch (err) {
      console.error('Failed to open box:', err);
    } finally {
      setOpeningBox(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 font-sans pb-16 selection:bg-electric selection:text-white">
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />

      {/* Futuristic Background Aura */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-electric/20 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 -right-32 w-72 h-72 bg-purple-600/15 rounded-full blur-[100px]" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-cyan-500/15 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-4 pt-4">
        {/* Top Header Card */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-lg mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-electric to-cyanAccent p-0.5 shadow-md shadow-electric/20">
                <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center font-bold text-base text-electric">
                  {tgUser?.first_name?.charAt(0) || 'U'}
                </div>
              </div>
              {tgUser?.is_premium && (
                <div className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 p-0.5 rounded-full shadow">
                  <Star className="w-3 h-3 fill-current" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-semibold text-sm text-white">
                <span>{tgUser?.first_name || 'Community Member'}</span>
                {tgUser?.is_premium && (
                  <span className="text-[10px] bg-amber-400/20 text-amber-400 font-medium px-1.5 py-0.2 rounded border border-amber-400/30">
                    PREMIUM
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Verified
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-amber-400 font-medium">
                  <Flame className="w-3 h-3 fill-current" />
                  {profile?.streakDays || 1}d Streak
                </span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Score</div>
            <div className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-electric">
              {((profile?.verifiedInvites || 0) * 10) + 50} pts
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900/90 backdrop-blur-md rounded-xl border border-white/5 mb-4 text-xs font-medium">
          <button
            onClick={() => { triggerHaptic('light'); setActiveTab('invite'); }}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'invite' 
                ? 'bg-electric text-white shadow-md shadow-electric/25' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            My Link
          </button>
          <button
            onClick={() => { triggerHaptic('light'); setActiveTab('vault'); }}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 relative ${
              activeTab === 'vault' 
                ? 'bg-electric text-white shadow-md shadow-electric/25' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            Vault
            {(profile?.unopenedCount || 0) > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-slate-950 font-bold text-[9px] rounded-full flex items-center justify-center">
                {profile?.unopenedCount}
              </span>
            )}
          </button>
          <button
            onClick={() => { triggerHaptic('light'); setActiveTab('ranks'); }}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'ranks' 
                ? 'bg-electric text-white shadow-md shadow-electric/25' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            Top 10
          </button>
        </div>

        {/* TAB 1: INVITE & REFERRAL LINK */}
        {activeTab === 'invite' && (
          <div className="space-y-4">
            {/* Viral Booster Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-electric/20 via-purple-600/15 to-transparent border border-electric/30 backdrop-blur-xl relative overflow-hidden">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-electric/20 text-cyan-300 border border-electric/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    Telegram Premium 2x Booster Active!
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Earn <b>+20 Points</b> for every friend with Telegram Premium who joins, plus <b>+10 Points</b> for standard members!
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Share Action Card */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 backdrop-blur-xl shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-electric" />
                  Your 1-Click Bot Invite Link
                </span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">
                  Guaranteed Tracking
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/5 font-mono text-xs text-slate-300 break-all select-all flex items-center justify-between gap-2">
                <span className="truncate">{botLink || 'Loading personal link...'}</span>
                <button
                  onClick={() => copyToClipboard(botLink)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition shrink-0"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mt-3">
                <button
                  onClick={() => copyToClipboard(botLink)}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs flex items-center justify-center gap-2 border border-white/5 transition"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
                <button
                  onClick={shareViaTelegram}
                  className="py-3 px-4 rounded-xl bg-gradient-to-r from-electric to-cyanAccent hover:opacity-95 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-electric/25 transition active:scale-98"
                >
                  <Share2 className="w-4 h-4" />
                  Share with Friends
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 backdrop-blur-md">
                <div className="text-[11px] text-slate-400 font-medium">Verified Friends</div>
                <div className="text-xl font-extrabold text-white mt-1">
                  {profile?.verifiedInvites || 0}
                </div>
                <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3 h-3" /> 100% Attributed
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 backdrop-blur-md">
                <div className="text-[11px] text-slate-400 font-medium">Next Mystery Chest</div>
                <div className="text-xl font-extrabold text-amber-400 mt-1">
                  {profile?.progressToNextBox.invitesNeeded || 3} left
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="bg-amber-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${profile?.progressToNextBox.percent || 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MYSTERY VAULT */}
        {activeTab === 'vault' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 text-center relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
              
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-amber-400/20 via-amber-500/10 to-transparent border border-amber-400/30 flex items-center justify-center text-4xl shadow-xl shadow-amber-500/10 mb-3 animate-bounce">
                🎁
              </div>

              <h3 className="font-bold text-base text-white">Mystery Loot Chests</h3>
              <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
                Every 3 verified friends unlocks a Mystery Chest packed with bonus points, Stars, or point multipliers!
              </p>

              <div className="mt-4 p-3 rounded-xl bg-slate-900/80 border border-white/5 inline-flex items-center gap-3">
                <span className="text-xs text-slate-400">Available Chests:</span>
                <span className="text-sm font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                  {profile?.unopenedCount || 0} Ready
                </span>
              </div>

              <div className="mt-4">
                {(profile?.unopenedCount || 0) > 0 ? (
                  <button
                    onClick={handleOpenMysteryChest}
                    disabled={openingBox}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 active:scale-98 transition disabled:opacity-50"
                  >
                    {openingBox ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Cracking Chest...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Crack Open Chest!
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => { triggerHaptic('light'); setActiveTab('invite'); }}
                    className="w-full py-3.5 px-4 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 border border-white/5"
                  >
                    Invite {profile?.progressToNextBox.invitesNeeded || 3} More Friends to Unlock Chest
                  </button>
                )}
              </div>

              {openedLoot && (
                <div className="mt-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold animate-pulse">
                  🎉 Winner! You unlocked: {openedLoot}
                </div>
              )}
            </div>

            {/* Potential Rewards Info */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 text-xs">
              <div className="font-semibold text-white mb-2 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-400" />
                Loot Table Rarities:
              </div>
              <div className="space-y-1.5 text-slate-400 text-[11px]">
                <div className="flex justify-between">
                  <span>⚡ Cyber Chest (Top 10%):</span>
                  <span className="text-cyan-400 font-medium">3x Point Multiplier</span>
                </div>
                <div className="flex justify-between">
                  <span>💎 Gold Chest (20%):</span>
                  <span className="text-amber-400 font-medium">+100 Ultra Points</span>
                </div>
                <div className="flex justify-between">
                  <span>✨ Silver/Bronze (70%):</span>
                  <span className="text-slate-200 font-medium">+25 to +50 Growth Points</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LEADERBOARD */}
        {activeTab === 'ranks' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 backdrop-blur-xl">
              <div className="text-xs font-bold text-white mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Top Community Referrers
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Real-Time</span>
              </div>

              <div className="space-y-2">
                {[
                  { rank: 1, name: 'Alex M.', points: '1,420 pts', invites: 48, badge: '🥇' },
                  { rank: 2, name: 'Satoshi99', points: '980 pts', invites: 32, badge: '🥈' },
                  { rank: 3, name: 'Elena_TG', points: '640 pts', invites: 21, badge: '🥉' },
                  { rank: 4, name: tgUser?.first_name || 'You', points: `${((profile?.verifiedInvites || 0) * 10) + 50} pts`, invites: profile?.verifiedInvites || 0, isYou: true },
                  { rank: 5, name: 'CryptoKnight', points: '290 pts', invites: 9, badge: '' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition ${
                      item.isYou 
                        ? 'bg-electric/15 border border-electric/40 text-white font-semibold' 
                        : 'bg-slate-950/60 border border-white/5 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 text-center font-bold text-slate-400">
                        {item.badge || `#${item.rank}`}
                      </span>
                      <span>{item.name} {item.isYou && <span className="text-[10px] text-electric font-normal">(You)</span>}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 text-[11px]">{item.invites} joins</span>
                      <span className="font-bold text-cyan-300">{item.points}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
