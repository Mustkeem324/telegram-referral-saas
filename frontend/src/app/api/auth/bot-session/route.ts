import { NextResponse } from 'next/server';
import { createAuthSession } from '../../../../lib/auth-sessions';

export async function POST() {
  const session = createAuthSession();
  console.log(`🔐 [AUTH_SESSION_CREATED] ID: ${session.sessionId} | Link: ${session.botDeepLink}`);
  return NextResponse.json(session);
}

export async function GET() {
  const session = createAuthSession();
  return NextResponse.json(session);
}
