'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from './api';

interface User {
  _id: string;
  telegram_id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  role: 'superadmin' | 'user';
  photo_url?: string;
}

interface Workspace {
  _id: string;
  name: string;
  slug: string;
  owner_telegram_id: string;
  role?: string;
  status: string;
}

interface AuthContextType {
  user: User | null;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  token: string | null;
  isLoading: boolean;
  loginWithDev: (role?: 'superadmin' | 'user') => Promise<void>;
  switchWorkspace: (workspaceId: string) => void;
  logout: () => void;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
      const wsList = data.workspaces.map((w: any) => ({
        ...w.workspace,
        role: w.role,
      }));
      setWorkspaces(wsList);

      const savedWsId = localStorage.getItem('activeWorkspaceId');
      const found = wsList.find((w: any) => w._id === savedWsId) || wsList[0];
      if (found) {
        setActiveWorkspace(found);
        localStorage.setItem('activeWorkspaceId', found._id);
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check Telegram WebApp initData if running inside Telegram
    const tgWebApp = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null;
    if (tgWebApp && tgWebApp.initData) {
      api.telegramWebAppLogin(tgWebApp.initData)
        .then((res: any) => {
          localStorage.setItem('token', res.token);
          setToken(res.token);
          if (res.workspaceId) localStorage.setItem('activeWorkspaceId', res.workspaceId);
          fetchProfile();
        })
        .catch(() => {
          // fallback to localStorage
          checkLocalToken();
        });
      return;
    }

    checkLocalToken();
  }, []);

  const checkLocalToken = () => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      fetchProfile();
    } else {
      setIsLoading(false);
    }
  };

  const loginWithDev = async (role: 'superadmin' | 'user' = 'user') => {
    setIsLoading(true);
    try {
      const tgId = role === 'superadmin' ? '123456789' : '88880001';
      const name = role === 'superadmin' ? 'Super Admin' : 'Alex Founder';
      const res = await api.devLogin({
        telegramId: tgId,
        firstName: name,
        username: role === 'superadmin' ? 'superadmin' : 'alex_founder',
        role,
      });

      localStorage.setItem('token', res.token);
      setToken(res.token);
      if (res.workspaceId) {
        localStorage.setItem('activeWorkspaceId', res.workspaceId);
      }
      await fetchProfile();
    } catch (err) {
      console.error('Dev login failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const switchWorkspace = (workspaceId: string) => {
    const ws = workspaces.find((w) => w._id === workspaceId);
    if (ws) {
      setActiveWorkspace(ws);
      localStorage.setItem('activeWorkspaceId', ws._id);
      window.location.reload();
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('activeWorkspaceId');
    setUser(null);
    setWorkspaces([]);
    setActiveWorkspace(null);
    setToken(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        workspaces,
        activeWorkspace,
        token,
        isLoading,
        loginWithDev,
        switchWorkspace,
        logout,
        refreshUserData: fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
