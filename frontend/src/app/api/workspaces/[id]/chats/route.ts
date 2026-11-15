import { NextRequest, NextResponse } from 'next/server';
import { getTelegramChats } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chats = await getTelegramChats(params.id);
    return NextResponse.json(chats);
  } catch (err: any) {
    console.error('Failed to get chats:', err);
    return NextResponse.json([], { status: 200 });
  }
}
