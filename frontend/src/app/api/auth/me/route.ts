import { NextRequest, NextResponse } from 'next/server';
import { authSessions } from '../../../../lib/auth-sessions';

// Authorized platform superadmin Telegram IDs
const SUPERADMIN_TELEGRAM_IDS = ['1951052299', '8005858260'];

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();

  console.log(`👤 [GET /api/auth/me] Validating token: "${token}"`);

  // Look up user from active session store
  let matchedUser: any = null;
  authSessions.forEach((sess) => {
    if (sess.token === token && sess.user) {
      matchedUser = sess.user;
    }
  });

  // Fallback: parse tg_token_<id>_<timestamp>
  if (!matchedUser && token.startsWith('tg_token_')) {
    const parts = token.split('_');
    if (parts[2]) {
      const parsedId = parts[2];
      const isOwner = parsedId === '1951052299' || parsedId === '8005858260';
      matchedUser = {
        id: parsedId,
        first_name: isOwner ? 'NX Dev' : 'Creator',
        username: isOwner ? 'nxproo' : `user_${parsedId}`,
      };
    }
  }

  // If no user found, fallback to guest/anonymous (role: 'user')
  const userId = String(matchedUser?.id || 'anonymous');
  const firstName = matchedUser?.first_name || 'Guest User';
  const username = matchedUser?.username || '';

  // STRICT ROLE ENFORCEMENT: Only authorized Telegram IDs or @nxproo are superadmins!
  const isSuperAdmin =
    SUPERADMIN_TELEGRAM_IDS.includes(userId) ||
    username.toLowerCase() === 'nxproo';

  const userRole: 'superadmin' | 'user' = isSuperAdmin ? 'superadmin' : 'user';

  console.log(`🛡️ [AUTH_ROLE_CHECK] User ID: ${userId} (@${username}) -> Assigned Role: ${userRole}`);

  return NextResponse.json({
    user: {
      _id: `usr_${userId}`,
      telegram_id: userId,
      first_name: firstName,
      username: username,
      role: userRole,
    },
    workspaces: [
      {
        workspace: {
          _id: `ws_${userId}`,
          name: `${firstName}'s Enterprise Hub`,
          slug: `hub-${userId}`,
          status: 'active',
          owner_telegram_id: userId,
        },
        role: isSuperAdmin ? 'owner' : 'member',
      },
    ],
  });
}
