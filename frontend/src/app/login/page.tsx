'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/AuthContext';
import { api } from '../../lib/api';
import { TelegramLoginWidget } from '../../components/TelegramLoginWidget';
import {
  Send,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Lock,
  ExternalLink,
  Loader2,
  Sparkles,
} from 'lucide-react';

export default function LoginPage() {
  const { user, loginWithTelegramData, loginWithToken } = useAuth();
  const router = useRouter();

  const [botSession, setBotSession] = useState<{ sessionId: string; botDeepLink: string } | null>(null);
  const [waitingForBot, setWaitingForBot] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Initialize a real Telegram Bot auth session for instant 1-click login
  useEffect(() => {
    api.createBotAuthSession()
      .then((session) => setBotSession(session))
      .catch((err) => console.error('Error creating bot session:', err));
  }, []);

  // Poll session when user clicks "Open Telegram App"
  useEffect(() => {
    if (!waitingForBot || !botSession) return;

    const interval = setInterval(async () => {
      try {
        const check = await api.checkBotAuthSession(botSession.sessionId);
        if (check.authenticated && check.token) {
          clearInterval(interval);
          setIsAuthenticating(true);
          await loginWithToken(check.token, check.workspaceId);
          router.push('/dashboard');
        }
      } catch (err) {
        // continue polling
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [waitingForBot, botSession, loginWithToken, router]);

  const handleTelegramAuth = async (tgUser: any) => {
    setIsAuthenticating(true);
    setErrorMessage(null);
    try {
      await loginWithTelegramData(tgUser);
      router.push('/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Telegram authentication failed.');
      setIsAuthenticating(false);
    }
  };

  const handleOpenBot = () => {
    if (!botSession) return;
    setWaitingForBot(true);
    window.open(botSession.botDeepLink, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-sky-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-sky-600/15 via-blue-600/10 to-indigo-600/5 blur-[140px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[350px] h-[250px] bg-sky-500/10 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        {/* Logo Badge */}
        <div className="inline-flex items-center justify-center p-1 rounded-2xl bg-gradient-to-b from-sky-400/30 to-slate-800/80 shadow-2xl mb-5">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/25">
            <Send className="w-7 h-7 text-white transform -translate-y-0.5 translate-x-0.5" />
          </div>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          TeleGrowth
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Enterprise Telegram Referral Tracking & Provably-Fair Giveaways
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/90 border border-slate-800/80 shadow-2xl rounded-2xl p-6 sm:p-8 backdrop-blur-2xl space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium text-center">
              {errorMessage}
            </div>
          )}

          {/* Primary Authentication Action: 1-Click Bot Login */}
          <div className="space-y-3">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block text-center">
              Direct Telegram Authentication
            </label>

            <button
              onClick={handleOpenBot}
              disabled={isAuthenticating}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-sky-500/25 disabled:opacity-50 group"
            >
              {waitingForBot ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Waiting for Telegram Confirmation...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Authorize with @TeleGrowthnxbot</span>
                </>
              )}
            </button>

            {waitingForBot && (
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-300 text-center animate-pulse">
                Click <strong>Start</strong> in Telegram to confirm your login. This page will automatically redirect!
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-slate-900 px-3 text-slate-500 font-medium">Or using Telegram Widget</span>
            </div>
          </div>

          {/* Official Telegram Login Widget */}
          <div className="flex flex-col items-center justify-center min-h-[44px]">
            <TelegramLoginWidget
              botName="TeleGrowthnxbot"
              onAuth={handleTelegramAuth}
              buttonSize="large"
              cornerRadius={10}
              requestAccess="write"
            />
          </div>

          {/* Security & Verification Badges */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Official Telegram Bot API Verification</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Signatures are cryptographically verified using SHA-256 HMAC. No passwords or third-party credentials required.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-slate-500">
          Connected to Central Telegram Bot <a href="https://t.me/TeleGrowthnxbot" target="_blank" rel="noreferrer" className="text-sky-400 hover:underline font-mono">@TeleGrowthnxbot</a>
        </div>
      </div>
    </div>
  );
}
