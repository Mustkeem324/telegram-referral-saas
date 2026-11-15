import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '../../../../../lib/auth-sessions';

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = params;
  const session = getAuthSession(sessionId);

  if (!session) {
    return NextResponse.json({ authenticated: false, error: 'Session not found or expired' }, { status: 404 });
  }

  return NextResponse.json({
    authenticated: session.authenticated,
    token: session.token,
    workspaceId: session.workspaceId,
    user: session.user,
  });
}
