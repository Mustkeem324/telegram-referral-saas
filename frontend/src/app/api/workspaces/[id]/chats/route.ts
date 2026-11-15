import { NextRequest, NextResponse } from 'next/server';
import { connectDB, TelegramChatModel } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const chats = await TelegramChatModel.find({ workspace_id: params.id }).sort({ created_at: -1 });
    return NextResponse.json(chats);
  } catch (err: any) {
    console.error('Failed to get chats:', err);
    return NextResponse.json([], { status: 200 });
  }
}
