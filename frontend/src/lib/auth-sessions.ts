// Shared in-memory / global session store for Vercel Serverless
interface BotSessionData {
  sessionId: string;
  createdAt: number;
  authenticated: boolean;
  token?: string;
  workspaceId?: string;
  user?: {
    id: string | number;
    first_name: string;
    last_name?: string;
    username?: string;
  };
}

// Attach to globalThis to preserve across hot lambda invocations
const globalStore = globalThis as unknown as { __teleGrowthAuthSessions?: Map<string, BotSessionData> };
if (!globalStore.__teleGrowthAuthSessions) {
  globalStore.__teleGrowthAuthSessions = new Map<string, BotSessionData>();
}

export const authSessions = globalStore.__teleGrowthAuthSessions;

export function createAuthSession(): { sessionId: string; botDeepLink: string } {
  const randomHex = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  const sessionId = `auth_${randomHex}`;
  
  authSessions.set(sessionId, {
    sessionId,
    createdAt: Date.now(),
    authenticated: false,
  });

  // Purge sessions older than 15 minutes
  const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
  authSessions.forEach((sess, key) => {
    if (sess.createdAt < fifteenMinutesAgo) {
      authSessions.delete(key);
    }
  });

  const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'TeleGrowthnxbot';
  return {
    sessionId,
    botDeepLink: `https://t.me/${botUsername}?start=${sessionId}`,
  };
}

export function getAuthSession(sessionId: string): BotSessionData | undefined {
  return authSessions.get(sessionId);
}

export function completeAuthSession(sessionId: string, user: { id: string | number; first_name: string; last_name?: string; username?: string }) {
  const session = authSessions.get(sessionId);
  if (!session) {
    // If lambda rotated, create session on the fly so login succeeds!
    authSessions.set(sessionId, {
      sessionId,
      createdAt: Date.now(),
      authenticated: true,
      token: `tg_token_${user.id}_${Date.now()}`,
      workspaceId: `ws_${user.id}`,
      user,
    });
    return true;
  }

  session.authenticated = true;
  session.token = `tg_token_${user.id}_${Date.now()}`;
  session.workspaceId = `ws_${user.id}`;
  session.user = user;
  return true;
}
