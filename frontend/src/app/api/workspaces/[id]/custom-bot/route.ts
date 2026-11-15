import { NextRequest, NextResponse } from 'next/server';
import { connectDB, ConnectedBotModel } from '@/lib/db';

const APP_URL = 'https://frontend-eight-ebon-22.vercel.app';

// GET: Check real custom bot status for this workspace (NO DEMO / FAKE BOTS)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const workspaceId = params.id;
    const bot = await ConnectedBotModel.findOne({ workspace_id: workspaceId, is_active: true });

    if (!bot) {
      return NextResponse.json({
        connected: false,
      });
    }

    return NextResponse.json({
      connected: true,
      bot: {
        bot_id: bot.bot_id,
        bot_username: bot.bot_username,
        first_name: bot.first_name,
        is_active: bot.is_active,
        health_status: bot.health_status,
        last_ping_ms: bot.last_ping_ms,
      },
    });
  } catch (err: any) {
    console.error('Failed to get custom bot:', err);
    return NextResponse.json({ connected: false, error: err.message });
  }
}

// POST: Connect a new custom bot via real Telegram token
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const workspaceId = params.id;
    const body = await req.json().catch(() => ({}));
    const token = (body.token || '').trim();

    if (!token || !token.includes(':')) {
      return NextResponse.json(
        { error: 'Invalid token format. Please provide a valid Telegram bot token from @BotFather.' },
        { status: 400 }
      );
    }

    // Verify token with Telegram Bot API
    const getMeRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const meData = await getMeRes.json().catch(() => ({}));

    if (!meData.ok || !meData.result) {
      return NextResponse.json(
        { error: 'Telegram rejected this token. Please ensure it is active and copied correctly from @BotFather.' },
        { status: 400 }
      );
    }

    const botUser = meData.result;
    const botUsername = botUser.username || '';
    const botId = String(botUser.id);
    const firstName = botUser.first_name || 'Custom Bot';

    // Register Webhook with Telegram for serverless execution on Vercel
    const webhookUrl = `${APP_URL}/api/webhook/telegram?bot_token=${token}`;
    const setWhRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query', 'my_chat_member', 'chat_member'],
        drop_pending_updates: true,
      }),
    });
    const whData = await setWhRes.json().catch(() => ({}));
    console.log(`🤖 Registered webhook for custom bot @${botUsername}:`, whData);

    // Persist real bot in MongoDB
    const bot = await ConnectedBotModel.findOneAndUpdate(
      { workspace_id: workspaceId },
      {
        $set: {
          bot_id: botId,
          bot_username: botUsername,
          first_name: firstName,
          token: token,
          is_active: true,
          health_status: 'healthy',
          last_health_check_at: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      bot: {
        bot_id: bot.bot_id,
        bot_username: bot.bot_username,
        first_name: bot.first_name,
        is_active: true,
      },
    });
  } catch (err: any) {
    console.error('Failed to connect custom bot:', err);
    return NextResponse.json({ error: err.message || 'Internal error connecting custom bot' }, { status: 500 });
  }
}

// DELETE: Disconnect custom bot cleanly
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const workspaceId = params.id;
    const bot = await ConnectedBotModel.findOne({ workspace_id: workspaceId });

    if (bot && bot.token) {
      // Clear webhook on Telegram
      await fetch(`https://api.telegram.org/bot${bot.token}/deleteWebhook`).catch(() => {});
    }

    await ConnectedBotModel.deleteOne({ workspace_id: workspaceId });

    return NextResponse.json({
      success: true,
      message: 'Custom bot disconnected successfully.',
    });
  } catch (err: any) {
    console.error('Failed to delete custom bot:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
