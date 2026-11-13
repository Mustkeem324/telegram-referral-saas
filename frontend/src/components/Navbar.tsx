'use client';

import React from 'react';
import { useAuth } from '../lib/AuthContext';
import { LogOut, User as UserIcon, Shield } from 'lucide-react';

export function Navbar() {
  const { user, logout, activeWorkspace } = useAuth();

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur px-8 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-medium text-slate-300">
          Workspace: <span className="font-semibold text-white">{activeWorkspace?.name || 'Loading...'}</span>
        </h1>
        {activeWorkspace?.role && (
          <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-sky-400 border border-slate-700">
            {activeWorkspace.role}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/80">
              <div className="w-7 h-7 rounded-full bg-sky-600 flex items-center justify-center text-xs font-bold text-white">
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
                <span title="Super Admin">
                  <Shield className="w-3.5 h-3.5 text-amber-400 ml-1" />
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
