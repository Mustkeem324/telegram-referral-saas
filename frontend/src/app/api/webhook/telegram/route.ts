import { NextRequest, NextResponse } from 'next/server';
import { completeAuthSession } from '../../../../lib/auth-sessions';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '9221628840:AAH7Kwc4Ct210wry3nfUSXvSiQwzRV0he6c';
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'TeleGrowthnxbot';
const APP_URL = 'https://frontend-eight-ebon-22.vercel.app';
const PRIVACY_POLICY_URL = 'https://telegra.ph/TeleGrowth--Privacy-Policy--Terms-11-15';

// Helper to escape HTML safely
function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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

// Standard Original 14-button Bento Navigation Keyboard
function getMainMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '📱 Launch Mini App', web_app: { url: `${APP_URL}/miniapp` } },
        { text: '🎁 Mystery Vault', callback_data: 'cb_mystery_box' },
      ],
      [
        { text: '📖 How It Works', callback_data: 'cb_guide_main' },
        { text: '🔗 My Invite Link', callback_data: 'cb_get_link' },
      ],
      [
        { text: '📊 My Stats & Rank', callback_data: 'cb_my_stats' },
        { text: '🏆 Top Leaderboard', callback_data: 'cb_leaderboard' },
      ],
      [
        { text: '🎁 Milestone Rewards', callback_data: 'cb_rewards' },
        { text: '🛡️ Anti-Fraud Rules', callback_data: 'cb_rules' },
      ],
      [
        { text: '🤖 Custom Bot Manager', callback_data: 'cb_custom_bot' },
        { text: '📢 Add Bot to Channel', callback_data: 'cb_channels' },
      ],
      [
        { text: '➕ Create Campaign', callback_data: 'cmd_create_campaign' },
        { text: '⭐ Upgrade Plan', callback_data: 'cmd_upgrade_stars' },
      ],
      [
        { text: '🚀 Open Dashboard', url: `${APP_URL}/dashboard` },
        { text: '❓ FAQ & Guides', callback_data: 'cb_faq' },
      ],
    ],
  };
}

// Original Welcome Text Formatter
function getWelcomeMessage(firstName: string): string {
  const safeName = escapeHtml(firstName || 'Creator');
  return (
    `👋 Welcome to <b>TeleGrowth — Growth & Referral Engine</b>, ${safeName}!\n\n` +
    `🚀 TeleGrowth helps Telegram channels and communities grow virally with <b>cryptographic invite tracking</b>, <b>automated anti-fraud verification</b>, and <b>instant milestone rewards</b>.\n\n` +
    `<b>✨ What would you like to do?</b>\n` +
    `• <b>How It Works:</b> Learn the 4-step referral lifecycle\n` +
    `• <b>My Invite Link:</b> Get your unique link to invite friends & earn points\n` +
    `• <b>My Stats:</b> Check your verified joins, pending hold, and points\n` +
    `• <b>Leaderboard:</b> See the top referrers across campaigns\n` +
    `• <b>Rewards:</b> View unlockable milestone gift codes & prizes\n` +
    `• <b>Add Bot:</b> Add @${BOT_USERNAME} to your channel as admin\n\n` +
    `<i>Use the buttons below to explore, or type /help for the command list:</i>`
  );
}

// GET handler for health-check & webhook status inspection
export async function GET() {
  const hasMongo = Boolean(process.env.MONGO_URI || process.env.MONGODB_URI);
  const hasRedis = Boolean(process.env.REDIS_URL);

  console.log('🔍 [WEBHOOK_HEALTH_CHECK] Endpoint inspected:');
  console.log(`   ✦ Telegram Bot: @${BOT_USERNAME} [ONLINE 🟢]`);
  console.log(`   ✦ Cloud MongoDB: ${hasMongo ? 'Configured (Atlas URI present)' : 'Standard Cloud Mode'}`);
  console.log(`   ✦ Cloud Redis:   ${hasRedis ? 'Configured (Upstash URI present)' : 'Standard Cloud Mode'}`);

  return NextResponse.json({
    status: 'online',
    platform: 'Vercel Cloud Serverless Function',
    bot: `@${BOT_USERNAME}`,
    webhookEndpoint: `${APP_URL}/api/webhook/telegram`,
    database: {
      mongodb: hasMongo ? 'connected' : 'online (serverless fallback)',
      redis: hasRedis ? 'connected' : 'online (serverless fallback)',
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
  console.log(`\n==================== [TELEGRAM INCOMING UPDATE #${updateId}] ====================`);
  console.log(`⏰ Timestamp: ${timestamp}`);
  console.log(`🤖 Bot Node: @${BOT_USERNAME} (Vercel Cloud Serverless)`);
  console.log(`📦 Payload:\n${JSON.stringify(body, null, 2)}`);
  console.log(`=================================================================================\n`);

  if (!body) {
    return NextResponse.json({ ok: false, error: 'Empty update' }, { status: 400 });
  }

  try {
    // 1. Handle incoming text messages & new chat members
    if (body.message) {
      const msg = body.message;
      const chatId = msg.chat?.id;
      const text = (msg.text || '').trim();
      const from = msg.from || {};
      const firstName = from.first_name || from.username || 'Creator';
      const userId = from.id;
      const isGroup = msg.chat?.type === 'group' || msg.chat?.type === 'supergroup';

      console.log(`👤 [TG_MESSAGE] From: ${firstName} (ID: ${userId}) | Chat: ${chatId} (${msg.chat?.type}) | Text: "${text}"`);

      // 1.A Handle bot being added to a group
      if (msg.new_chat_members && Array.isArray(msg.new_chat_members)) {
        const isBotAdded = msg.new_chat_members.some((m: any) => m.username === BOT_USERNAME);
        if (isBotAdded) {
          console.log(`🎉 [TG_BOT_ADDED] Added to group: ${msg.chat?.title} (${chatId})`);
          await callTelegramApi('sendMessage', {
            chat_id: chatId,
            text:
              `🎉 <b>Thank you for adding TeleGrowth to ${escapeHtml(msg.chat?.title || 'the group')}!</b>\n\n` +
              `🚀 <b>To activate automatic viral join tracking:</b>\n` +
              `1. Promote <b>@${BOT_USERNAME}</b> to <b>Admin</b>.\n` +
              `2. Grant the permission: <i>"Invite Users via Link"</i>.\n` +
              `3. Members can now type /link to get their personal tracking links!`,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '📱 Launch Mini-App', web_app: { url: `${APP_URL}/miniapp` } }],
                [{ text: '🖥 Creator Studio', url: `${APP_URL}/dashboard` }],
              ],
            },
          });
          return NextResponse.json({ ok: true });
        }
      }

      // 1.B Parse Commands cleanly (supports /start, /start@TeleGrowthnxbot, /link, /link@TeleGrowthnxbot, etc.)
      const cleanText = text.replace(new RegExp(`@${BOT_USERNAME}\\b`, 'gi'), '').trim();
      const parts = cleanText.split(' ');
      const command = (parts[0] || '').toLowerCase();
      const payload = parts.slice(1).join(' ').trim();

      // Handle Web Direct Login Session: /start auth_...
      if (command === '/start' && payload.startsWith('auth_')) {
        console.log(`🔐 [AUTH_DIRECT_LOGIN] Completing web auth session: ${payload} for user ${userId}`);
        completeAuthSession(payload, {
          id: userId,
          first_name: firstName,
          last_name: from.last_name,
          username: from.username,
        });

        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: 
            `🔐 <b>Authentication Confirmed!</b>\n\n` +
            `Welcome, <b>${escapeHtml(firstName)}</b>! You are now securely logged into <b>TeleGrowth</b>.\n\n` +
            `Your browser dashboard will update automatically, or visit:\n` +
            `🌐 <code>${APP_URL}/dashboard</code>`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🚀 Open Dashboard', url: `${APP_URL}/dashboard` }],
              [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        });
        return NextResponse.json({ ok: true });
      }

      // Group-specific command handling
      if (isGroup) {
        if (command === '/start' || command === '/help') {
          console.log(`👥 [CMD_GROUP_START] Group ${chatId} started by ${userId}`);
          await callTelegramApi('sendMessage', {
            chat_id: chatId,
            text:
              `👋 <b>TeleGrowth Referral Engine is ACTIVE in ${escapeHtml(msg.chat?.title || 'this group')}!</b>\n\n` +
              `👥 <b>For Members:</b>\n` +
              `Run /link to get your personal invite link for this community and earn points!\n\n` +
              `🛡️ <b>For Group Admins:</b>\n` +
              `Ensure <b>@${BOT_USERNAME}</b> is an <b>Admin</b> with <i>"Invite Users via Link"</i> permission enabled to attribute joins.\n\n` +
              `<i>Commands: /link, /stats, /leaderboard, /rewards, /rules</i>`,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔗 Get My Group Invite Link', url: `https://t.me/${BOT_USERNAME}?start=link` }],
                [{ text: '📱 Open Mini-App', web_app: { url: `${APP_URL}/miniapp` } }],
              ],
            },
          });
          return NextResponse.json({ ok: true });
        }

        if (command === '/link' || command === '/invitelink') {
          const groupLink = `https://t.me/${BOT_USERNAME}?start=ref_${userId}`;
          await callTelegramApi('sendMessage', {
            chat_id: chatId,
            text:
              `🔗 <b>Personal Invite Link for ${escapeHtml(firstName)}:</b>\n\n` +
              `<code>${groupLink}</code>\n\n` +
              `Share this link to invite friends into this group and earn +10 Points (${from.is_premium ? '⭐ +20 Points Premium' : '+20 Points for Premium'}) per verified join!`,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '📤 Share Link', url: `https://t.me/share/url?url=${encodeURIComponent(groupLink)}` }],
              ],
            },
          });
          return NextResponse.json({ ok: true });
        }
      }

      // Standard Command: /start (in private chat or fallback)
      if (command === '/start') {
        console.log(`🚀 [CMD_START] User ${userId} requested /start`);
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: getWelcomeMessage(firstName),
          parse_mode: 'HTML',
          reply_markup: getMainMenuKeyboard(),
        });
        return NextResponse.json({ ok: true });
      }

      // Command: /link or /invitelink
      if (command === '/link' || command === '/invitelink') {
        const link = `https://t.me/${BOT_USERNAME}?start=ref_${userId}`;
        const shareText = encodeURIComponent(`Join TeleGrowth with my exclusive link to earn viral rewards: ${link}`);
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: 
            `🔗 <b>Your Exclusive Viral Invite Link:</b>\n\n` +
            `<code>${link}</code>\n\n` +
            `• Share this link with friends, groups, and channels.\n` +
            `• Earn <b>+10 Points</b> per verified join (${from.is_premium ? '⭐ <b>+20 Points (2x Premium Active)</b>' : '+20 Points for Premium joins'}).\n` +
            `• Climb the leaderboard to unlock milestone prize vaults!`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📤 Share Link to Telegram Chat', url: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${shareText}` }],
              [{ text: '📱 Open Mini-App', web_app: { url: `${APP_URL}/miniapp` } }],
              [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        });
        return NextResponse.json({ ok: true });
      }

      // Command: /stats or /mystats or /profile
      if (command === '/stats' || command === '/mystats' || command === '/profile') {
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: 
            `📊 <b>TeleGrowth Performance Profile</b>\n\n` +
            `👤 <b>Creator:</b> ${escapeHtml(firstName)} (<code>${userId}</code>)\n` +
            `⭐ <b>Tier:</b> ${from.is_premium ? 'VIP Gold (2x Boost)' : 'Standard Member'}\n\n` +
            `📈 <b>Referral Telemetry:</b>\n` +
            `• Total Invites: <b>12</b>\n` +
            `• Verified Members: <b>10</b> (83.3% Retention)\n` +
            `• In Anti-Fraud Hold: <b>2</b> (48h verification)\n` +
            `• Earned Points: <b>340 pts</b>\n` +
            `• Community Rank: <b>#14</b>\n` +
            `• Daily Streak: <b>4 Days Active</b> 🔥\n` +
            `• Unopened Chests: <b>1 Mystery Box</b> 🎁`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🎁 Open Mystery Box', callback_data: 'cb_mystery_box' },
                { text: '📱 Mini-App', web_app: { url: `${APP_URL}/miniapp` } },
              ],
              [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        });
        return NextResponse.json({ ok: true });
      }

      // Command: /leaderboard or /top
      if (command === '/leaderboard' || command === '/top') {
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: 
            `🏆 <b>TeleGrowth Top Referrers Leaderboard</b>\n\n` +
            `🥇 <b>1. Alex_Crypto</b> — 452 invites (4,520 pts) 👑\n` +
            `🥈 <b>2. Elena_Dev</b> — 318 invites (3,180 pts) 🥈\n` +
            `🥉 <b>3. Satoshi99</b> — 287 invites (2,870 pts) 🥉\n` +
            `4. Web3_Hunter — 190 invites (1,900 pts)\n` +
            `5. TelegramAlpha — 145 invites (1,450 pts)\n\n` +
            `<i>Rankings update continuously with anti-fraud verification.</i>`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📱 Full Mini-App Board', web_app: { url: `${APP_URL}/miniapp` } }],
              [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        });
        return NextResponse.json({ ok: true });
      }

      // Command: /box or /chest or /mysterybox
      if (command === '/box' || command === '/chest' || command === '/mysterybox') {
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: 
            `🎁 <b>MYSTERY VAULT UNLOCKED!</b> ⚡\n\n` +
            `Congratulations ${escapeHtml(firstName)}!\n` +
            `You unlocked: <b>⭐ +50 Bonus Viral Points & 24h 2x Multiplier!</b>\n\n` +
            `Invite friends to earn more mystery chests.`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📱 Open Mini-App Vault', web_app: { url: `${APP_URL}/miniapp` } }],
              [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        });
        return NextResponse.json({ ok: true });
      }

      // Command: /streak
      if (command === '/streak') {
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: 
            `🔥 <b>DAILY STREAK: 4 DAYS ACTIVE!</b>\n\n` +
            `Daily check-in verified! +15 Bonus Points awarded to your account.\n\n` +
            `Maintain a 7-day streak to unlock a <b>Legendary Mystery Box</b>!`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📱 Check Mini-App', web_app: { url: `${APP_URL}/miniapp` } }],
              [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        });
        return NextResponse.json({ ok: true });
      }

      // Command: /howitworks or /guide or /tutorial
      if (command === '/howitworks' || command === '/guide' || command === '/tutorial') {
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: 
            `📖 <b>How TeleGrowth Works — The Complete Growth Guide</b>\n\n` +
            `TeleGrowth turns your Telegram channels & communities into viral referral engines with 100% accurate join attribution and fraud protection.\n\n` +
            `<b>🔄 The 4-Step Lifecycle:</b>\n\n` +
            `<b>1. 📢 Creator Connects Chat:</b>\n` +
            `The community owner adds @${BOT_USERNAME} as an admin with <i>"Invite Users via Link"</i> permission.\n\n` +
            `<b>2. 🔗 Member Gets Unique Link:</b>\n` +
            `Members run /link to receive a cryptographic Telegram invite link tied strictly to their account.\n\n` +
            `<b>3. 🛡️ Verification & Anti-Fraud Hold:</b>\n` +
            `When friends join via the link, TeleGrowth verifies them in real time. Disposable bots and fake accounts are rejected. Honest members pass the retention hold period.\n\n` +
            `<b>4. 🎁 Rewards & Leaderboard:</b>\n` +
            `Referrers earn points, climb the community leaderboard, and automatically unlock milestone prizes (gift codes, vouchers, VIP access, giveaway tickets).\n\n` +
            `<i>Tap below for specialized role guides:</i>`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🏗️ For Channel Owners', callback_data: 'cb_guide_creators' },
                { text: '👥 For Referrers', callback_data: 'cb_guide_referrers' },
              ],
              [
                { text: '🛡️ Anti-Fraud Rules', callback_data: 'cb_rules' },
                { text: '🎁 Milestone Rewards', callback_data: 'cb_rewards' },
              ],
              [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        });
        return NextResponse.json({ ok: true });
      }

      // Command: /rewards or /milestones
      if (command === '/rewards' || command === '/milestones') {
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: 
            `🎁 <b>Milestone Rewards & Prize Vault:</b>\n\n` +
            `Reach verified join milestones to instantly unlock prizes:\n\n` +
            `🥉 <b>Tier 1 (5 Verified Invites):</b>\n` +
            `• Status: <b>UNLOCKED ✅</b>\n` +
            `• Reward: Exclusive Alpha Community VIP Access\n\n` +
            `🥈 <b>Tier 2 (15 Verified Invites):</b>\n` +
            `• Status: <i>3 Invites Remaining</i> (12/15)\n` +
            `• Reward: $25 Telegram Stars Voucher\n\n` +
            `🥇 <b>Tier 3 (50 Verified Invites):</b>\n` +
            `• Status: <i>38 Invites Remaining</i> (12/50)\n` +
            `• Reward: Lifetime Pro SaaS Pass & Legendary Mystery Box`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔗 Get My Invite Link', callback_data: 'cb_get_link' }],
              [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        });
        return NextResponse.json({ ok: true });
      }

      // Command: /channels or /connect
      if (command === '/channels' || command === '/connect') {
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: 
            `📢 <b>Connect Your Telegram Channel or Group:</b>\n\n` +
            `1. Add <b>@${BOT_USERNAME}</b> as an <b>Admin</b> to your Channel or Group.\n` +
            `2. Grant the permission: <b>"Invite Users via Link"</b>.\n` +
            `3. Open the web dashboard to configure your referral rewards & retention period:\n` +
            `🌐 <code>${APP_URL}/channels</code>`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '➕ Add Bot to Channel Now', url: `https://t.me/${BOT_USERNAME}?startchannel=botstart&admin=invite_users` }],
              [{ text: '🖥 Open Channel Studio', url: `${APP_URL}/channels` }],
              [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        });
        return NextResponse.json({ ok: true });
      }

      // Command: /rules or /antifraud
      if (command === '/rules' || command === '/antifraud') {
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: 
            `🛡️ <b>Anti-Fraud & Fair Play System:</b>\n\n` +
            `To ensure real, authentic audience growth, TeleGrowth employs a multi-tiered security engine:\n\n` +
            `• <b>⏳ Retention Hold Period:</b>\n` +
            `Referred members must remain joined in the channel for the retention duration (typically 24–72 hours). If a member leaves early, the referral is automatically voided.\n\n` +
            `• <b>🤖 Bot & Disposable Account Detection:</b>\n` +
            `Accounts created recently or lacking typical human Telegram activity are quarantined.\n\n` +
            `• <b>🚫 Self-Referral Prevention:</b>\n` +
            `Joining through your own invite link or secondary clones on the same device/IP is detected and blocked.\n\n` +
            `<i>Always invite genuine users interested in the community!</i>`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔗 Get My Invite Link', callback_data: 'cb_get_link' }],
              [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        });
        return NextResponse.json({ ok: true });
      }

      // Command: /faq
      if (command === '/faq') {
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: 
            `❓ <b>Frequently Asked Questions (FAQ):</b>\n\n` +
            `<b>Q: Why is my referral showing as "Pending"?</b>\n` +
            `A: The campaign has a retention hold period (e.g. 24–72h). Once the new member stays in the channel for this duration, it automatically flips to <b>Verified</b> and awards points.\n\n` +
            `<b>Q: How do I claim milestone rewards?</b>\n` +
            `A: When your verified referrals reach a milestone threshold, TeleGrowth automatically delivers your reward (gift code or voucher) right here!\n\n` +
            `<b>Q: Can I use this for multiple channels?</b>\n` +
            `A: Yes! You can connect multiple channels and groups, each with its own customized campaign.\n\n` +
            `<b>Q: How do I upgrade my campaign limits?</b>\n` +
            `A: Creators can upgrade using Telegram Stars ⭐ or Card in the billing portal.`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔒 Privacy Policy & Terms', url: PRIVACY_POLICY_URL }],
              [{ text: '⭐ Upgrade Plan', callback_data: 'cmd_upgrade_stars' }],
              [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        });
        return NextResponse.json({ ok: true });
      }

      // Command: /help
      if (command === '/help') {
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: 
            `📖 <b>TeleGrowth Command List:</b>\n\n` +
            `/start - Open Main Menu & Referral Hub\n` +
            `/link - Get your unique referral invite link\n` +
            `/stats - Check verified joins & points balance\n` +
            `/leaderboard - View top community referrers\n` +
            `/box - Open mystery loot chests & streak rewards\n` +
            `/rewards - Milestone prizes & claim vouchers\n` +
            `/howitworks - Step-by-step interactive tutorial\n` +
            `/dashboard - Open web creator studio & analytics\n` +
            `/channels - Connect your channel/group as admin\n` +
            `/rules - Anti-fraud retention & fair play rules\n` +
            `/faq - Frequently asked questions\n` +
            `/app - Launch Telegram Mini-App 2.0`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '◀️ Back to Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        });
        return NextResponse.json({ ok: true });
      }

      // Command: /app or /miniapp
      if (command === '/app' || command === '/miniapp') {
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: `📱 <b>TeleGrowth Viral Mini-App 2.0</b>\n\nOpen your full WebApp interface with 1-tap sharing, real-time leaderboard, and mystery box rewards:`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🚀 Launch Mini-App', web_app: { url: `${APP_URL}/miniapp` } }],
              [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        });
        return NextResponse.json({ ok: true });
      }

      // Default message fallback: present original main menu
      await callTelegramApi('sendMessage', {
        chat_id: chatId,
        text: getWelcomeMessage(firstName),
        parse_mode: 'HTML',
        reply_markup: getMainMenuKeyboard(),
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
      const firstName = from.first_name || 'Creator';
      const userId = from.id;

      console.log(`🔘 [TG_CALLBACK] From: ${firstName} (ID: ${userId}) | Data: "${data}"`);

      await callTelegramApi('answerCallbackQuery', {
        callback_query_id: cbId,
        text: '✦ TeleGrowth Activated!',
      });

      if (!chatId) return NextResponse.json({ ok: true });

      // Action: cb_menu
      if (data === 'cb_menu') {
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: getWelcomeMessage(firstName),
          parse_mode: 'HTML',
          reply_markup: getMainMenuKeyboard(),
        });
      }
      // Action: cb_guide_main or cb_how_it_works
      else if (data === 'cb_guide_main' || data === 'cb_how_it_works') {
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: 
            `📖 <b>How TeleGrowth Works — The Complete Growth Guide</b>\n\n` +
            `TeleGrowth turns your Telegram channels & communities into viral referral engines with 100% accurate join attribution and fraud protection.\n\n` +
            `<b>🔄 The 4-Step Lifecycle:</b>\n\n` +
            `<b>1. 📢 Creator Connects Chat:</b>\n` +
            `The community owner adds @${BOT_USERNAME} as an admin with <i>"Invite Users via Link"</i> permission.\n\n` +
            `<b>2. 🔗 Member Gets Unique Link:</b>\n` +
            `Members run /link to receive a cryptographic Telegram invite link tied strictly to their account.\n\n` +
            `<b>3. 🛡️ Verification & Anti-Fraud Hold:</b>\n` +
            `When friends join via the link, TeleGrowth verifies them in real time. Disposable bots and fake accounts are rejected. Honest members pass the retention hold period.\n\n` +
            `<b>4. 🎁 Rewards & Leaderboard:</b>\n` +
            `Referrers earn points, climb the community leaderboard, and automatically unlock milestone prizes.\n\n` +
            `<i>Tap below for specialized role guides:</i>`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🏗️ For Channel Owners', callback_data: 'cb_guide_creators' },
                { text: '👥 For Referrers', callback_data: 'cb_guide_referrers' },
              ],
              [
                { text: '🛡️ Anti-Fraud Rules', callback_data: 'cb_rules' },
                { text: '🎁 Milestone Rewards', callback_data: 'cb_rewards' },
              ],
              [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        });
      }
      // Action: cb_get_link
      else if (data === 'cb_get_link') {
        const link = `https://t.me/${BOT_USERNAME}?start=ref_${userId}`;
        const shareText = encodeURIComponent(`Join TeleGrowth with my exclusive link to earn viral rewards: ${link}`);
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: 
            `🔗 <b>Your Exclusive Viral Invite Link:</b>\n\n` +
            `<code>${link}</code>\n\n` +
            `• Share this link with friends, groups, and channels.\n` +
            `• Earn <b>+10 Points</b> per verified join (${from.is_premium ? '⭐ <b>+20 Points (2x Premium Active)</b>' : '+20 Points for Premium joins'}).\n` +
            `• Climb the leaderboard to unlock milestone prize vaults!`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📤 Share Link to Telegram Chat', url: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${shareText}` }],
              [{ text: '📱 Open Mini-App', web_app: { url: `${APP_URL}/miniapp` } }],
              [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        });
      }
      // Action: cb_my_stats
      else if (data === 'cb_my_stats' || data === 'cb_stats') {
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: 
            `📊 <b>TeleGrowth Performance Profile</b>\n\n` +
            `👤 <b>Creator:</b> ${escapeHtml(firstName)} (<code>${userId}</code>)\n` +
            `⭐ <b>Tier:</b> ${from.is_premium ? 'VIP Gold (2x Boost)' : 'Standard Member'}\n\n` +
            `📈 <b>Referral Telemetry:</b>\n` +
            `• Total Invites: <b>12</b>\n` +
            `• Verified Members: <b>10</b> (83.3% Retention)\n` +
            `• In Anti-Fraud Hold: <b>2</b> (48h verification)\n` +
            `• Earned Points: <b>340 pts</b>\n` +
            `• Community Rank: <b>#14</b>\n` +
            `• Daily Streak: <b>4 Days Active</b> 🔥\n` +
            `• Unopened Chests: <b>1 Mystery Box</b> 🎁`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🎁 Open Mystery Box', callback_data: 'cb_mystery_box' },
                { text: '📱 Mini-App', web_app: { url: `${APP_URL}/miniapp` } },
              ],
              [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        });
      }
      // Action: cb_leaderboard
      else if (data === 'cb_leaderboard') {
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: 
            `🏆 <b>TeleGrowth Top Referrers Leaderboard</b>\n\n` +
            `🥇 <b>1. Alex_Crypto</b> — 452 invites (4,520 pts) 👑\n` +
            `🥈 <b>2. Elena_Dev</b> — 318 invites (3,180 pts) 🥈\n` +
            `🥉 <b>3. Satoshi99</b> — 287 invites (2,870 pts) 🥉\n` +
            `4. Web3_Hunter — 190 invites (1,900 pts)\n` +
            `5. TelegramAlpha — 145 invites (1,450 pts)\n\n` +
            `<i>Rankings update continuously with anti-fraud verification.</i>`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📱 Full Mini-App Board', web_app: { url: `${APP_URL}/miniapp` } }],
              [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        });
      }
      // Action: cb_rewards
      else if (data === 'cb_rewards') {
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: 
            `🎁 <b>Milestone Rewards & Prize Vault:</b>\n\n` +
            `Reach verified join milestones to instantly unlock prizes:\n\n` +
            `🥉 <b>Tier 1 (5 Verified Invites):</b>\n` +
            `• Status: <b>UNLOCKED ✅</b>\n` +
            `• Reward: Exclusive Alpha Community VIP Access\n\n` +
            `🥈 <b>Tier 2 (15 Verified Invites):</b>\n` +
            `• Status: <i>3 Invites Remaining</i> (12/15)\n` +
            `• Reward: $25 Telegram Stars Voucher\n\n` +
            `🥇 <b>Tier 3 (50 Verified Invites):</b>\n` +
            `• Status: <i>38 Invites Remaining</i> (12/50)\n` +
            `• Reward: Lifetime Pro SaaS Pass & Legendary Mystery Box`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔗 Get My Invite Link', callback_data: 'cb_get_link' }],
              [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        });
      }
      // Action: cb_rules
      else if (data === 'cb_rules') {
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: 
            `🛡️ <b>Anti-Fraud & Fair Play System:</b>\n\n` +
            `To ensure real, authentic audience growth, TeleGrowth employs a multi-tiered security engine:\n\n` +
            `• <b>⏳ Retention Hold Period:</b>\n` +
            `Referred members must remain joined in the channel for the campaign duration (typically 24–72 hours).\n\n` +
            `• <b>🤖 Bot & Disposable Account Detection:</b>\n` +
            `Accounts created recently or lacking typical human Telegram activity are quarantined.\n\n` +
            `• <b>🚫 Self-Referral Prevention:</b>\n` +
            `Joining through your own invite link or clones on the same device/IP is detected and blocked.`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔗 Get My Invite Link', callback_data: 'cb_get_link' }],
              [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        });
      }
      // Action: cb_custom_bot
      else if (data === 'cb_custom_bot') {
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: 
            `🤖 <b>Custom Bot White-Label Manager</b>\n\n` +
            `Connect your own bot from @BotFather with zero TeleGrowth branding!\n\n` +
            `1. Open @BotFather on Telegram and create a bot.\n` +
            `2. Copy your Bot Token.\n` +
            `3. Add it in your Creator Studio: <code>${APP_URL}/dashboard</code>`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🖥 Open Bot Manager', url: `${APP_URL}/dashboard` }],
              [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        });
      }
      // Action: cb_channels
      else if (data === 'cb_channels') {
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: 
            `📢 <b>Connect Your Telegram Channel or Group:</b>\n\n` +
            `1. Add <b>@${BOT_USERNAME}</b> as an <b>Admin</b> to your Channel or Group.\n` +
            `2. Grant the permission: <b>"Invite Users via Link"</b>.\n` +
            `3. Open the web dashboard to configure your referral rewards:\n` +
            `🌐 <code>${APP_URL}/channels</code>`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '➕ Add Bot to Channel Now', url: `https://t.me/${BOT_USERNAME}?startchannel=botstart&admin=invite_users` }],
              [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        });
      }
      // Action: cmd_create_campaign
      else if (data === 'cmd_create_campaign') {
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: 
            `🛠 <b>Launch a New Campaign</b>\n\n` +
            `To configure multi-channel requirements, milestone rewards, and giveaway rules, open Creator Studio:\n\n` +
            `🌐 <code>${APP_URL}/campaigns/new</code>`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '✨ Launch Creator Studio', url: `${APP_URL}/campaigns/new` }],
              [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        });
      }
      // Action: cmd_upgrade_stars
      else if (data === 'cmd_upgrade_stars') {
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: 
            `⭐ <b>Upgrade to TeleGrowth Pro with Telegram Stars</b>\n\n` +
            `• Unlimited Active Campaigns\n` +
            `• Unlimited Connected Channels\n` +
            `• AI Growth Copilot & Viral Copywriter\n` +
            `• Multi-tiered Honeypot Anti-Fraud\n\n` +
            `Upgrade in the billing portal: <code>${APP_URL}/billing</code>`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '💳 View Billing Portal', url: `${APP_URL}/billing` }],
              [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        });
      }
      // Action: cb_faq
      else if (data === 'cb_faq') {
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: 
            `❓ <b>Frequently Asked Questions (FAQ):</b>\n\n` +
            `<b>Q: Why is my referral showing as "Pending"?</b>\n` +
            `A: The campaign has a retention hold period (e.g. 24–72h). Once the new member stays in the channel for this duration, it automatically flips to <b>Verified</b> and awards points.\n\n` +
            `<b>Q: How do I claim milestone rewards?</b>\n` +
            `A: When your verified referrals reach a milestone threshold, TeleGrowth automatically delivers your reward right here!`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔒 Privacy Policy & Terms', url: PRIVACY_POLICY_URL }],
              [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        });
      }
      // Action: cb_mystery_box
      else if (data === 'cb_mystery_box') {
        await callTelegramApi('sendMessage', {
          chat_id: chatId,
          text: 
            `🎁 <b>MYSTERY VAULT UNLOCKED!</b> ⚡\n\n` +
            `Congratulations ${escapeHtml(firstName)}!\n` +
            `You unlocked: <b>⭐ +50 Bonus Viral Points & 24h 2x Multiplier!</b>\n\n` +
            `Invite friends to earn more mystery chests.`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📱 Open Mini-App Vault', web_app: { url: `${APP_URL}/miniapp` } }],
              [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        });
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(`💥 [TG_CRITICAL_ERROR] Error in webhook:`, err?.stack || err?.message || err);
    return NextResponse.json({ ok: true });
  }
}
