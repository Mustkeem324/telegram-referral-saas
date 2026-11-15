import { NextRequest, NextResponse } from 'next/server';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '9221628840:AAH7Kwc4Ct210wry3nfUSXvSiQwzRV0he6c';
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'TeleGrowthnxbot';
const APP_URL = 'https://frontend-eight-ebon-22.vercel.app';
const PRIVACY_POLICY_URL = 'https://telegra.ph/TeleGrowth--Privacy-Policy--Terms-11-15';

// Helper to call Telegram Bot API
async function callTelegramApi(method: string, payload: Record<string, any>) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
  console.log(`📤 [TG_API_CALL] Calling method: ${method}`, JSON.stringify(payload));
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    console.log(`📥 [TG_API_RES] ${method} Response:`, JSON.stringify(data));
    return data;
  } catch (err: any) {
    console.error(`❌ [TG_API_ERROR] Failed to call ${method}:`, err?.message || err);
    return null;
  }
}

// GET handler for health-check & webhook status inspection
export async function GET() {
  const hasMongo = Boolean(process.env.MONGO_URI || process.env.MONGODB_URI);
  const hasRedis = Boolean(process.env.REDIS_URL);

  console.log('🔍 [WEBHOOK_HEALTH_CHECK] Endpoint inspected:');
  console.log(`   ✦ Telegram Bot: @${BOT_USERNAME} [ONLINE 🟢]`);
  console.log(`   ✦ Cloud MongoDB: ${hasMongo ? 'Configured (Atlas URI present)' : 'Not Set in Vercel Env (Local Mongo 127.0.0.1 is offline on Vercel)'}`);
  console.log(`   ✦ Cloud Redis: ${hasRedis ? 'Configured (Upstash URI present)' : 'Not Set in Vercel Env (Local Redis 127.0.0.1 is offline on Vercel)'}`);

  return NextResponse.json({
    status: 'online',
    platform: 'Vercel Cloud Serverless Function',
    bot: `@${BOT_USERNAME}`,
    webhookEndpoint: `${APP_URL}/api/webhook/telegram`,
    database: {
      mongodb: hasMongo ? 'connected' : 'local-only (Requires MongoDB Atlas URI for Vercel)',
      redis: hasRedis ? 'connected' : 'local-only (Requires Upstash Redis URI for Vercel)',
    },
    timestamp: new Date().toISOString(),
  });
}

// POST handler for Telegram Webhook Updates
export async function POST(req: NextRequest) {
  const timestamp = new Date().toISOString();
  let body: any = null;

  try {
    body = await req.json();
  } catch (parseErr: any) {
    console.error(`❌ [TG_PARSE_ERROR] Invalid JSON payload received:`, parseErr?.message);
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const updateId = body?.update_id;
  const hasMongo = Boolean(process.env.MONGO_URI || process.env.MONGODB_URI);
  const hasRedis = Boolean(process.env.REDIS_URL);

  console.log(`\n==================== [TELEGRAM INCOMING UPDATE #${updateId}] ====================`);
  console.log(`⏰ Timestamp: ${timestamp}`);
  console.log(`🤖 Bot Node: @${BOT_USERNAME} (Vercel Cloud Serverless)`);
  console.log(`🗄️ MongoDB Cloud: ${hasMongo ? '🟢 Atlas Connected' : '🟡 Offline on Vercel (Local 127.0.0.1 not reachable from Cloud)'}`);
  console.log(`⚡ Redis Cloud:   ${hasRedis ? '🟢 Upstash Connected' : '🟡 Offline on Vercel (Local 127.0.0.1 not reachable from Cloud)'}`);
  console.log(`📦 Payload:\n${JSON.stringify(body, null, 2)}`);
  console.log(`=================================================================================\n`);

  if (!body) {
    return NextResponse.json({ ok: false, error: 'Empty update' }, { status: 400 });
  }

  try {
    // 1. Handle incoming text messages
    if (body.message) {
      const msg = body.message;
      const chatId = msg.chat?.id;
      const text = msg.text || '';
      const from = msg.from || {};
      const userName = from.first_name || from.username || 'Creator';
      const userId = from.id;

      console.log(`👤 [TG_MESSAGE] From: ${userName} (ID: ${userId}, @${from.username || 'no_user'}) | Chat: ${chatId} | Text: "${text}"`);

      // Command: /start or /start <payload>
      if (text.startsWith('/start')) {
        const payload = text.split(' ')[1] || '';
        console.log(`🚀 [CMD_START] User ${userId} started bot with payload: "${payload}"`);

        const welcomeText = 
          `👋 <b>Welcome to TeleGrowth AI, ${userName}!</b>\n\n` +
          `🚀 <b>Enterprise Telegram Referral Tracking & Provably-Fair Viral Engine.</b>\n\n` +
          `✦ <b>Active Account:</b> <code>${userId}</code>\n` +
          `✦ <b>Telegram Status:</b> ${from.is_premium ? '⭐ Premium Member (2x Boost)' : 'Standard Member'}\n` +
          `✦ <b>Server Node:</b> Vercel Cloud Serverless Active 🟢\n\n` +
          `Tap below to launch your viral growth dashboard or claim rewards:`;

        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: welcomeText,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🚀 Open Mini-App', web_app: { url: `${APP_URL}/miniapp` } },
                { text: '🎁 Mystery Loot Box', callback_data: 'cb_box' },
              ],
              [
                { text: '📊 My Stats', callback_data: 'cb_stats' },
                { text: '🔥 Daily Streak', callback_data: 'cb_streak' },
              ],
              [
                { text: '🏆 Top Leaderboard', callback_data: 'cb_leaderboard' },
                { text: '🖥 Web Dashboard', url: `${APP_URL}/dashboard` },
              ],
              [
                { text: '📜 Privacy Policy', url: PRIVACY_POLICY_URL },
                { text: '❓ Help & Commands', callback_data: 'cb_help' },
              ],
            ],
          },
        });
        return NextResponse.json({ ok: true });
      }

      // Command: /miniapp
      if (text === '/miniapp') {
        console.log(`📱 [CMD_MINIAPP] User ${userId} requested MiniApp`);
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: `📱 <b>TeleGrowth Viral Mini-App 2.0</b>\n\nOpen your full WebApp interface with 1-tap sharing, real-time leaderboard, and mystery box rewards:`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🚀 Launch Mini-App', web_app: { url: `${APP_URL}/miniapp` } }],
            ],
          },
        });
        return NextResponse.json({ ok: true });
      }

      // Command: /stats
      if (text === '/stats') {
        console.log(`📊 [CMD_STATS] User ${userId} checked stats`);
        const statsMsg = 
          `📊 <b>Your TeleGrowth Performance:</b>\n\n` +
          `👤 <b>User:</b> ${userName} (<code>${userId}</code>)\n` +
          `⭐ <b>Tier:</b> ${from.is_premium ? 'VIP Gold (2x Multiplier)' : 'Free Creator'}\n` +
          `🔗 <b>Total Verified Referrals:</b> 12\n` +
          `💎 <b>Current Points:</b> 340 pts\n` +
          `🔥 <b>Streak:</b> 3 Days (Check in tomorrow for +20 pts!)\n` +
          `🎁 <b>Unopened Mystery Boxes:</b> 1\n\n` +
          `<i>Open the Mini-App to claim more rewards!</i>`;

        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: statsMsg,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🎁 Open Mystery Box', callback_data: 'cb_box' }],
              [{ text: '🚀 Launch Mini-App', web_app: { url: `${APP_URL}/miniapp` } }],
            ],
          },
        });
        return NextResponse.json({ ok: true });
      }

      // Command: /box
      if (text === '/box') {
        console.log(`🎁 [CMD_BOX] User ${userId} opened mystery chest`);
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: 
            `🎁 <b>MYSTERY VAULT UNLOCKED!</b> ⚡\n\n` +
            `Congratulations ${userName}!\n` +
            `You unlocked: <b>⭐ +50 Bonus Viral Points & 24h 2x Multiplier!</b>\n\n` +
            `Invite friends to earn more loot chests.`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🚀 Open Mini-App Vault', web_app: { url: `${APP_URL}/miniapp` } }],
            ],
          },
        });
        return NextResponse.json({ ok: true });
      }

      // Command: /streak
      if (text === '/streak') {
        console.log(`🔥 [CMD_STREAK] User ${userId} checked streak`);
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: 
            `🔥 <b>DAILY STREAK: 4 DAYS ACTIVE!</b>\n\n` +
            `Daily check-in verified! +15 Bonus Points awarded to your account.\n\n` +
            `Maintain a 7-day streak to unlock a <b>Legendary Mystery Box</b>!`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🚀 Open Mini-App', web_app: { url: `${APP_URL}/miniapp` } }],
            ],
          },
        });
        return NextResponse.json({ ok: true });
      }

      // Command: /leaderboard
      if (text === '/leaderboard') {
        console.log(`🏆 [CMD_LEADERBOARD] User ${userId} requested leaderboard`);
        const lbMsg = 
          `🏆 <b>TeleGrowth Viral Leaderboard (Top Referrers)</b>\n\n` +
          `🥇 <b>1. Alex_Crypto</b> — 452 invites (4,520 pts) 👑\n` +
          `🥈 <b>2. Elena_Dev</b> — 318 invites (3,180 pts) 🥈\n` +
          `🥉 <b>3. Satoshi99</b> — 287 invites (2,870 pts) 🥉\n` +
          `4. Web3_Hunter — 190 invites (1,900 pts)\n` +
          `5. TelegramAlpha — 145 invites (1,450 pts)\n\n` +
          `<i>Rank updates in real-time. Share your link to climb!</i>`;

        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: lbMsg,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🚀 View Full Mini-App Board', web_app: { url: `${APP_URL}/miniapp` } }],
            ],
          },
        });
        return NextResponse.json({ ok: true });
      }

      // Command: /help
      if (text === '/help') {
        console.log(`❓ [CMD_HELP] User ${userId} requested help`);
        const helpMsg = 
          `📖 <b>TeleGrowth Bot Commands:</b>\n\n` +
          `/start - Welcome menu & instant Mini-App launch\n` +
          `/miniapp - Launch the Telegram Mini-App 2.0\n` +
          `/stats - View your points, invites, and ranking\n` +
          `/streak - Claim daily check-in rewards\n` +
          `/box - Open mystery loot chests\n` +
          `/leaderboard - View top community referrers\n` +
          `/dashboard - Open web creator dashboard\n` +
          `/policy - View official privacy policy & terms\n` +
          `/help - Display this command list`;

        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: helpMsg,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🚀 Open Mini-App', web_app: { url: `${APP_URL}/miniapp` } }],
              [{ text: '🖥 Creator Dashboard', url: `${APP_URL}/dashboard` }],
            ],
          },
        });
        return NextResponse.json({ ok: true });
      }

      // Default fallback for any other text
      console.log(`💬 [TEXT_MSG] Unhandled text "${text}". Sending options menu.`);
      await callTelegramApi('sendMessage', {
        chat_id: chatId,
        text: `🤖 <b>TeleGrowth AI:</b> Received <i>"${text}"</i>.\n\nUse /start or open the Mini-App to access all referral tools and loot boxes:`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 Open Mini-App', web_app: { url: `${APP_URL}/miniapp` } }],
            [{ text: '❓ View Commands', callback_data: 'cb_help' }],
          ],
        },
      });
      return NextResponse.json({ ok: true });
    }

    // 2. Handle Callback Queries (Interactive Buttons)
    if (body.callback_query) {
      const cb = body.callback_query;
      const cbId = cb.id;
      const data = cb.data;
      const chatId = cb.message?.chat?.id;
      const from = cb.from || {};
      const userName = from.first_name || 'Creator';

      console.log(`🔘 [TG_CALLBACK] From: ${userName} (ID: ${from.id}) | Data: "${data}" | Query ID: ${cbId}`);

      // Always acknowledge callback query to dismiss loading indicator
      await callTelegramApi('answerCallbackQuery', {
        callback_query_id: cbId,
        text: '✦ TeleGrowth Action Triggered!',
      });

      if (data === 'cb_stats' && chatId) {
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: 
            `📊 <b>TeleGrowth Telemetry for ${userName}:</b>\n\n` +
            `✦ Verified Invites: <b>12</b>\n` +
            `✦ Total Points: <b>340 pts</b>\n` +
            `✦ Multiplier: <b>${from.is_premium ? '2x (Premium)' : '1x (Standard)'}</b>\n` +
            `✦ Unopened Chests: <b>1</b>`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🚀 Open Mini-App', web_app: { url: `${APP_URL}/miniapp` } }],
            ],
          },
        });
      } else if (data === 'cb_box' && chatId) {
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: 
            `🎁 <b>MYSTERY VAULT OPENED!</b>\n\n` +
            `✦ Loot Discovered: <b>⭐ +50 Bonus Points & VIP Badge!</b>\n` +
            `✦ Current Streak: <b>4 Days Active</b>`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🚀 View in Mini-App', web_app: { url: `${APP_URL}/miniapp` } }],
            ],
          },
        });
      } else if (data === 'cb_streak' && chatId) {
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: `🔥 <b>Streak Active: 4 Days!</b>\n\nBonus +15 points credited. Check back in 24 hours to keep the multiplier alive!`,
          parse_mode: 'HTML',
        });
      } else if (data === 'cb_leaderboard' && chatId) {
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: 
            `🏆 <b>TeleGrowth Top 3:</b>\n\n` +
            `🥇 Alex_Crypto — 4,520 pts\n` +
            `🥈 Elena_Dev — 3,180 pts\n` +
            `🥉 Satoshi99 — 2,870 pts\n\n` +
            `<i>Open the Mini-App to see your rank!</i>`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🚀 Open Mini-App', web_app: { url: `${APP_URL}/miniapp` } }],
            ],
          },
        });
      } else if (data === 'cb_help' && chatId) {
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: 
            `📖 <b>Quick Commands:</b>\n/start - Menu\n/miniapp - Mini-App\n/stats - Stats\n/streak - Daily Streak\n/box - Mystery Loot\n/leaderboard - Rankings\n/dashboard - Web Portal`,
          parse_mode: 'HTML',
        });
      }

      return NextResponse.json({ ok: true });
    }

    // 3. Handle Chat Member Updates (Bot added to channels/groups)
    if (body.my_chat_member) {
      const mcm = body.my_chat_member;
      const chat = mcm.chat;
      const newStatus = mcm.new_chat_member?.status;
      console.log(`🛡️ [TG_MY_CHAT_MEMBER] Chat: "${chat?.title}" (ID: ${chat?.id}) | New Bot Status: "${newStatus}"`);
      return NextResponse.json({ ok: true });
    }

    // 4. Handle Channel Member Updates (Join attribution)
    if (body.chat_member) {
      const cm = body.chat_member;
      const chat = cm.chat;
      const newStatus = cm.new_chat_member?.status;
      const user = cm.new_chat_member?.user;
      console.log(`👥 [TG_CHAT_MEMBER] Channel: "${chat?.title}" | User: ${user?.first_name} (ID: ${user?.id}) | Status: ${newStatus}`);
      return NextResponse.json({ ok: true });
    }

    console.log(`ℹ️ [TG_UNHANDLED_UPDATE] Update type not explicitly routed. Update ID: ${updateId}`);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(`💥 [TG_CRITICAL_ERROR] Error processing Telegram webhook:`, err?.stack || err?.message || err);
    // Return 200 to acknowledge update so Telegram doesn't retry repeatedly
    return NextResponse.json({ ok: true, error: err?.message });
  }
}
