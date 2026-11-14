'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/AuthContext';
import {
  LayoutDashboard,
  Megaphone,
  Radio,
  Award,
  Gift,
  ShieldAlert,
  CreditCard,
  Settings,
  ShieldCheck,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { user, workspaces, activeWorkspace, switchWorkspace } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
    { name: 'Connected Chats', href: '/channels', icon: Radio },
    { name: 'Milestone Rewards', href: '/rewards', icon: Award },
    { name: 'Giveaways & Raffles', href: '/giveaways', icon: Gift },
    { name: 'Anti-Fraud & Risk', href: '/antifraud', icon: ShieldAlert },
    { name: 'Subscription & Plans', href: '/billing', icon: CreditCard },
  ];

  if (user?.role === 'superadmin') {
    navigation.push({ name: 'Platform Admin', href: '/admin', icon: ShieldCheck });
  }

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0 select-none">
      {/* Brand header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
          <Radio className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-white tracking-tight text-base block leading-none">TeleGrowth</span>
          <span className="text-[10px] text-sky-400 font-semibold uppercase tracking-wider">Growth & Referral Engine</span>
        </div>
      </div>

      {/* Workspace Switcher */}
      <div className="px-4 py-4 border-b border-slate-800/80">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
          Workspace
        </label>
        <div className="relative">
          <select
            value={activeWorkspace?._id || ''}
            onChange={(e) => switchWorkspace(e.target.value)}
            className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white appearance-none pr-8 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            {workspaces.map((ws) => (
              <option key={ws._id} value={ws._id}>
                {ws.name} ({ws.role || 'member'})
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Central Bot Status */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/60">
        <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">Central Telegram Bot</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">@TeleGrowthnxbot is live with invite attribution active</p>
          <a
            href="https://t.me/TeleGrowthnxbot"
            target="_blank"
            rel="noreferrer"
            className="mt-2.5 text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium"
          >
            Open in Telegram <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </aside>
  );
}
