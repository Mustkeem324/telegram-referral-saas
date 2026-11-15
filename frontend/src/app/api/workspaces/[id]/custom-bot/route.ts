import { NextRequest, NextResponse } from 'next/server';
import { connectDB, isDbConnected, ConnectedBotModel, memConnectedBots } from '@/lib/db';

const APP_URL = 'https://frontend-eight-ebon-22.vercel.app';

// GET: Check real custom bot status for this workspace (NO DEMO / FAKE BOTS)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const workspaceId = params.id;
  try {
    const conn = await connectDB();
    if (conn && isDbConnected()) {
      const bot = await ConnectedBotModel.findOne({ workspace_id: workspaceId, is_active: true });
      if (bot) {
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
      }
    }
  } catch (err: any) {
    console.warn('DB custom bot check fallback to memory');
  }

  // Memory fallback
  const memBot = memConnectedBots.get(workspaceId);
  if (memBot && memBot.is_active) {
    return NextResponse.json({
      connected: true,
      bot: {
        bot_id: memBot.bot_id,
        bot_username: memBot.bot_username,
        first_name: memBot.first_name,
        is_active: true,
        health_status: memBot.health_status,
        last_ping_ms: memBot.last_ping_ms,
      },
    });
  }

  return NextResponse.json({
    connected: false,
  });
}

// POST: Connect a new custom bot via real Telegram token
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    const botData = {
      workspace_id: workspaceId,
      bot_id: botId,
      bot_username: botUsername,
      first_name: firstName,
      token: token,
      is_active: true,
      health_status: 'healthy',
      last_health_check_at: new Date(),
    };

    // Store in memory
    memConnectedBots.set(workspaceId, botData);

    // Persist real bot in MongoDB if available
    try {
      const conn = await connectDB();
      if (conn && isDbConnected()) {
        await ConnectedBotModel.findOneAndUpdate(
          { workspace_id: workspaceId },
          { $set: botData },
          { upsert: true, new: true }
        );
      }
    } catch (dbErr) {
      console.warn('DB custom bot save fallback to memory');
    }

    return NextResponse.json({
      success: true,
      bot: {
        bot_id: botId,
        bot_username: botUsername,
        first_name: firstName,
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
    const workspaceId = params.id;
    const memBot = memConnectedBots.get(workspaceId);
    let token = memBot?.token;

    try {
      const conn = await connectDB();
      if (conn && isDbConnected()) {
        const bot = await ConnectedBotModel.findOne({ workspace_id: workspaceId });
        if (bot?.token) token = bot.token;
        await ConnectedBotModel.deleteOne({ workspace_id: workspaceId });
      }
    } catch (e) {}

    if (token) {
      await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`).catch(() => {});
    }

    memConnectedBots.delete(workspaceId);

    return NextResponse.json({
      success: true,
      message: 'Custom bot disconnected successfully.',
    });
  } catch (err: any) {
    console.error('Failed to delete custom bot:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
