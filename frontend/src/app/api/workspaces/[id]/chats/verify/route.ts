import { NextRequest, NextResponse } from 'next/server';
import { saveTelegramChat } from '@/lib/db';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '9221628840:AAH7Kwc4Ct210wry3nfUSXvSiQwzRV0he6c';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workspaceId = params.id;
    const body = await req.json().catch(() => ({}));
    const rawChatId = (body.chatId || '').trim();

    if (!rawChatId) {
      return NextResponse.json({ error: 'Chat ID or @username is required.' }, { status: 400 });
    }

    // Call Telegram API getChat
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChat?chat_id=${encodeURIComponent(rawChatId)}`);
    const data = await res.json().catch(() => ({}));

    if (!data.ok || !data.result) {
      return NextResponse.json(
        {
          error:
            data.description ||
            'Could not find chat. Please ensure the bot has been added to the group/channel as an Administrator.',
        },
        { status: 400 }
      );
    }

    const chat = data.result;
    const chatIdStr = String(chat.id);
    const title = chat.title || chat.username || 'Telegram Community';
    const type = chat.type === 'channel' ? 'channel' : chat.type === 'supergroup' ? 'supergroup' : 'group';

    // Resilient save to MongoDB Atlas or serverless memory fallback
    const chatDoc = await saveTelegramChat(workspaceId, {
      chat_id: chatIdStr,
      title,
      type,
      username: chat.username,
      is_bot_admin: true,
      verification_status: 'verified',
    });

    return NextResponse.json({
      success: true,
      title: chatDoc.title,
      chat: chatDoc,
    });
  } catch (err: any) {
    console.error('Failed to verify chat:', err);
    return NextResponse.json({ error: err.message || 'Internal verification error' }, { status: 500 });
  }
}
