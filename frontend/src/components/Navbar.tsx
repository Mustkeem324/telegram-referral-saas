'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/AuthContext';
import { LogOut, User as UserIcon, Shield, ShieldAlert, Sparkles } from 'lucide-react';

export function Navbar() {
  const { user, logout, activeWorkspace } = useAuth();

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl px-8 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-medium text-slate-300">
          Workspace: <span className="font-semibold text-white">{activeWorkspace?.name || 'Loading...'}</span>
        </h1>
        {activeWorkspace?.role && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20">
            {activeWorkspace.role}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {user?.role === 'superadmin' && (
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/20 hover:border-amber-500/50 transition-all shadow-sm shadow-amber-500/10 group"
          >
            <Shield className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span>Admin Console</span>
          </Link>
        )}

        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/80">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-sm shadow-sky-500/30">
                {user.first_name[0]}
              </div>
              <div className="text-left">
                <span className="text-xs font-semibold text-white block leading-none">
                  {user.first_name} {user.last_name || ''}
                </span>
                <span className="text-[10px] text-slate-400">
                  {user.username ? `@${user.username}` : `ID: ${user.telegram_id}`}
                </span>
              </div>
              {user.role === 'superadmin' && (
                <span className="ml-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Admin
                </span>
              )}
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
