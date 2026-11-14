'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { LogOut, Shield, Menu, Radio, Sun, Moon } from 'lucide-react';

interface NavbarProps {
  onToggleMobileMenu?: () => void;
}

export function Navbar({ onToggleMobileMenu }: NavbarProps) {
  const { user, logout, activeWorkspace } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-16 border-b border-navy-700/80 bg-navy-900/80 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 select-none">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl bg-navy-800 border border-navy-700 text-slate-300 hover:text-white transition-colors"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2.5">
          <h1 className="text-xs sm:text-sm font-medium text-slate-300">
            Workspace: <span className="font-bold text-white">{activeWorkspace?.name || 'Loading...'}</span>
          </h1>
          {activeWorkspace?.role && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-electric/15 text-electric border border-electric/30">
              {activeWorkspace.role}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Dark / Light Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          aria-label="Toggle theme"
          className="p-2 rounded-xl bg-navy-800 border border-navy-700/80 text-slate-400 hover:text-white transition-all shadow-sm hover:border-slate-600 flex items-center gap-1.5"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
              <span className="text-[10px] font-semibold text-slate-300 hidden md:inline">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-electric transition-transform hover:-rotate-12" />
              <span className="text-[10px] font-semibold text-slate-700 hidden md:inline">Dark</span>
            </>
          )}
        </button>

        {/* Super Admin Quick Console Badge */}
        {user?.role === 'superadmin' && (
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/20 hover:border-amber-500/50 transition-all shadow-sm shadow-amber-500/10 group"
          >
            <Shield className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Admin Console</span>
            <span className="sm:hidden">Admin</span>
          </Link>
        )}

        {user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* User Pill */}
            <div className="flex items-center gap-2.5 bg-navy-800/90 px-3 py-1.5 rounded-xl border border-navy-700/80 shadow-sm">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-electric via-cyanAccent to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-sm shadow-electric/30">
                {user.first_name ? user.first_name[0] : 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <span className="text-xs font-semibold text-white block leading-none">
                  {user.first_name} {user.last_name || ''}
                </span>
                <span className="text-[10px] text-slate-400">
                  {user.username ? `@${user.username}` : `ID: ${user.telegram_id}`}
                </span>
              </div>
              {user.role === 'superadmin' && (
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 hidden sm:inline">
                  Superuser
                </span>
              )}
            </div>

            {/* Logout Action */}
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors border border-transparent hover:border-rose-500/20"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
