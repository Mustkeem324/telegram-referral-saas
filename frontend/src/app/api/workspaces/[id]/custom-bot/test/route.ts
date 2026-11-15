import { NextRequest, NextResponse } from 'next/server';
import { connectDB, isDbConnected, ConnectedBotModel, memConnectedBots } from '@/lib/db';

// POST: Run a diagnostic ping test on the connected custom bot
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  const workspaceId = params.id;

  try {
    let token: string | undefined = undefined;

    try {
      const conn = await connectDB();
      if (conn && isDbConnected()) {
        const bot = await ConnectedBotModel.findOne({ workspace_id: workspaceId });
        if (bot?.token) token = bot.token;
      }
    } catch (e) {
      console.warn('DB custom bot test check fallback to memory');
    }

    if (!token) {
      const memBot = memConnectedBots.get(workspaceId);
      if (memBot?.token) token = memBot.token;
    }

    if (!token) {
      return NextResponse.json({
        success: false,
        pingMs: 0,
        isRunning: false,
        error: 'No active custom bot found for this workspace. Please connect a bot token from @BotFather first.',
      });
    }

    // Ping Telegram API
    const pingStart = Date.now();
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const pingMs = Date.now() - pingStart;
    const data = await res.json().catch(() => ({}));

    if (!data.ok || !data.result) {
      return NextResponse.json({
        success: false,
        pingMs,
        isRunning: false,
        error: data.description || 'Telegram Bot API unreachable with stored token.',
      });
    }

    // Update memory
    const memBot = memConnectedBots.get(workspaceId);
    if (memBot) {
      memBot.health_status = 'healthy';
      memBot.last_ping_ms = pingMs;
      memBot.last_health_check_at = new Date();
    }

    // Update MongoDB if available
    try {
      const conn = await connectDB();
      if (conn && isDbConnected()) {
        await ConnectedBotModel.updateOne(
          { workspace_id: workspaceId },
          {
            $set: {
              health_status: 'healthy',
              last_ping_ms: pingMs,
              last_health_check_at: new Date(),
            },
          }
        );
      }
    } catch (e) {}

    return NextResponse.json({
      success: true,
      pingMs,
      isRunning: true,
      botInfo: {
        id: data.result.id,
        username: data.result.username,
        first_name: data.result.first_name,
      },
    });
  } catch (err: any) {
    console.error('Failed to test custom bot:', err);
    return NextResponse.json({
      success: false,
      pingMs: Date.now() - startTime,
      isRunning: false,
      error: err.message || 'Diagnostic ping failed',
    });
  }
}
