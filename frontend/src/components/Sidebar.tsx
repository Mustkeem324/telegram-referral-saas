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
  ShieldCheck,
  ChevronDown,
  ExternalLink,
  X,
  Sparkles,
  BookOpen,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, workspaces, activeWorkspace, switchWorkspace } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'How It Works', href: '/how-it-works', icon: BookOpen },
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

  const sidebarContent = (
    <aside className="w-64 bg-navy-850/95 backdrop-blur-xl border-r border-navy-700/80 flex flex-col h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-navy-700/80">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-electric via-cyanAccent to-blue-600 flex items-center justify-center shadow-lg shadow-electric/25 group-hover:scale-105 transition-transform duration-200">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-white tracking-tight text-base block leading-none">
              TeleGrowth
            </span>
            <span className="text-[10px] text-cyanAccent font-semibold tracking-wider uppercase block mt-1">
              Growth Engine
            </span>
          </div>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-750 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Workspace Selector */}
      <div className="px-4 py-3.5 border-b border-navy-700/60">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
          Workspace
        </label>
        <div className="relative">
          <select
            value={activeWorkspace?._id || ''}
            onChange={(e) => switchWorkspace(e.target.value)}
            className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-xs font-medium text-white appearance-none pr-8 focus:outline-none focus:border-electric focus:ring-1 focus:ring-electric transition-colors"
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
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(`${item.href}/`));
          const isSuper = item.href === '/admin';
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 relative ${
                isActive
                  ? isSuper
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                    : 'bg-electric/15 text-electric border border-electric/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-navy-750/80 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive
                      ? isSuper
                        ? 'text-amber-400'
                        : 'text-electric'
                      : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span>{item.name}</span>
              </div>

              {isActive && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSuper ? 'bg-amber-400' : 'bg-electric'
                  } shadow-sm`}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Central Bot Status Card */}
      <div className="p-3.5 border-t border-navy-700/80 bg-navy-900/60">
        <div className="bg-navy-800/90 border border-navy-700/80 rounded-2xl p-3 shadow-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-successGreen opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-successGreen"></span>
              </span>
              Central Bot Live
            </span>
            <span className="text-[10px] font-mono text-cyanAccent bg-cyanAccent/10 px-1.5 py-0.5 rounded border border-cyanAccent/20">
              Online
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            @TeleGrowthnxbot listening for invites & joins
          </p>
          <a
            href="https://t.me/TeleGrowthnxbot"
            target="_blank"
            rel="noreferrer"
            className="mt-2.5 text-[11px] text-electric hover:text-electric-light flex items-center justify-between font-semibold pt-1 border-t border-navy-700/60 transition-colors"
          >
            <span>Open in Telegram</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-navy-950/80 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />
          <div className="relative z-50 flex-1 flex max-w-xs w-full animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
