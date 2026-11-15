import { Telegraf, Context } from 'telegraf';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { encryptToken, decryptToken } from '../../utils/crypto';
import {
  User,
  Workspace,
  WorkspaceMember,
  SubscriptionPlan,
  Subscription,
  TelegramChat,
  ConnectedBot,
  Campaign,
  ReferralCode,
  ReferralLink,
  Referral,
  Reward,
  SupportTicket,
  CampaignRequirement,
} from '../../database/models';

export class TelegramService {
  private static bot: Telegraf | null = null;

  /**
   * Escape HTML special characters for Telegram HTML mode
   */
  static escapeHtml(text: string): string {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Safe reply helper: sends HTML formatted message with automatic plain-text fallback
   */
  static async safeReply(ctx: Context, htmlText: string, extra?: any): Promise<void> {
    try {
      await ctx.replyWithHTML(htmlText, extra);
    } catch (err: any) {
      logger.warn('HTML reply failed, falling back to plain text:', { error: err.message });
      try {
        const plain = htmlText.replace(/<[^>]*>?/gm, '');
        await ctx.reply(plain, extra);
      } catch (fallbackErr: any) {
        logger.error('Safe reply plain text fallback also failed:', { error: fallbackErr.message });
      }
    }
  }

  /**
   * Safe button generator: returns web_app if HTTPS, or callback_data if HTTP/localhost
   */
  private static makeWebButton(text: string, path: string, fallbackCallback: string): any {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${config.frontendUrl}${cleanPath}`;
    if (url.startsWith('https://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
      return { text, web_app: { url } };
    }
    return { text, callback_data: fallbackCallback };
  }

  /**
   * Helper to build the main interactive menu keyboard
   */
  private static getMainMenuKeyboard(): any {
    const dashBtn = this.makeWebButton('🚀 Open Dashboard', '/dashboard', 'cmd_open_dashboard');
    const miniAppBtn = this.makeWebButton('📱 Launch Mini App', '/miniapp', 'cb_miniapp');
    return {
      inline_keyboard: [
        [
          miniAppBtn,
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
          dashBtn,
          { text: '❓ FAQ & Guides', callback_data: 'cb_faq' },
        ],
      ],
    };
  }

  /**
   * Initialize central Telegram Bot
   */
  static getBot(): Telegraf {
    if (!this.bot) {
      this.bot = new Telegraf(config.telegram.botToken);
      this.setupBotHandlers(this.bot);
    }
    return this.bot;
  }

  /**
   * Register all command handlers & interactive flows
   */
  static setupBotHandlers(bot: Telegraf): void {
    // Error handler
    bot.catch((err: any, ctx: Context) => {
      logger.error(`Telegram Bot Error for ${ctx.updateType}:`, { error: err.message });
    });

    // /start command - supports onboarding, login auth, and referral deep linking
    bot.start(async (ctx) => {
      try {
        const from = ctx.from;
        if (!from) return;

        const telegramId = String(from.id);
        const startPayload = ctx.payload;
        const isPremium = Boolean((from as any).is_premium);

        // Find or create user
        let user = await User.findOne({ telegram_id: telegramId });
        if (!user) {
          user = await User.create({
            telegram_id: telegramId,
            first_name: from.first_name || 'Creator',
            last_name: from.last_name || '',
            username: from.username,
            role: (telegramId === config.superAdmin.telegramId || telegramId === '1951052299' || from.username?.toLowerCase() === 'nxproo') ? 'superadmin' : 'user',
            is_premium: isPremium,
            is_active: true,
          });
        } else if (user.is_premium !== isPremium) {
          user.is_premium = isPremium;
          await user.save();
        }

        // Ensure user has at least one active workspace
        let member = await WorkspaceMember.findOne({ user_id: user._id, status: 'active' });
        if (!member) {
          const isSuper = user.role === 'superadmin' || telegramId === config.superAdmin.telegramId || telegramId === '1951052299' || from.username?.toLowerCase() === 'nxproo';
          const plan =
            (await SubscriptionPlan.findOne({ code: isSuper ? 'enterprise' : 'free' })) ||
            (await SubscriptionPlan.findOne());

          if (plan) {
            let ws =
              (await Workspace.findOne({ owner_id: user._id })) ||
              (isSuper ? await Workspace.findOne({ slug: 'superadmin-workspace' }) : null);

            if (!ws) {
              ws = await Workspace.create({
                name: `${from.first_name || 'Creator'}'s Workspace`,
                slug: `ws-${telegramId}-${Date.now().toString(36)}`,
                owner_id: user._id,
                owner_telegram_id: telegramId,
                plan_id: plan._id,
                status: 'active',
              });
            }

            member = await WorkspaceMember.findOneAndUpdate(
              { workspace_id: ws._id, user_id: user._id },
              {
                $set: {
                  user_telegram_id: telegramId,
                  role: 'owner',
                  status: 'active',
                },
              },
              { upsert: true, new: true }
            );

            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            await Subscription.findOneAndUpdate(
              { workspace_id: ws._id },
              {
                $setOnInsert: {
                  workspace_id: ws._id,
                  plan_id: plan._id,
                  status: 'active',
                  current_period_start: new Date(),
                  current_period_end: nextMonth,
                  payment_provider: 'manual',
                },
              },
              { upsert: true }
            );
          }
        }

        // Handle Telegram Login Session deep link
        if (startPayload && startPayload.startsWith('auth_')) {
          const { AuthService } = await import('../auth/auth.service');
          const authenticated = await AuthService.completeBotAuthSession(startPayload, {
            id: from.id,
            first_name: from.first_name,
            last_name: from.last_name,
            username: from.username,
          });

          if (authenticated) {
            const firstName = TelegramService.escapeHtml(from.first_name || 'Creator');
            await TelegramService.safeReply(
              ctx,
              `🔐 <b>Authentication Confirmed!</b>\n\n` +
              `Welcome, <b>${firstName}</b>! You are now securely logged into <b>TeleGrowth</b>.\n\n` +
              `Your browser dashboard will update automatically, or visit: ${config.frontendUrl}/dashboard`
            );
            return;
          }
        }

        // Handle referral deep link if user joined through a campaign referral link
        if (startPayload && startPayload.startsWith('ref_')) {
          const code = startPayload.replace('ref_', '');
          const refRecord = await ReferralCode.findOne({ referral_code: code });
          if (refRecord) {
            refRecord.clicks_count += 1;
            await refRecord.save();

            const campaign = await Campaign.findById(refRecord.campaign_id);
            if (campaign) {
              if (from.id && String(from.id) !== refRecord.user_telegram_id) {
                await User.findOneAndUpdate(
                  { telegram_id: telegramId },
                  {
                    $set: {
                      referred_by_telegram_id: refRecord.user_telegram_id,
                      referred_by_code: code,
                      referred_campaign_id: campaign._id,
                    },
                  }
                );
              }

              const referrerUser = await User.findOne({ telegram_id: refRecord.user_telegram_id });
              const referrerName = referrerUser
                ? (referrerUser.first_name || referrerUser.username || 'a friend')
                : 'a community member';

              const req = await CampaignRequirement.findOne({ campaign_id: campaign._id });
              const targetChat = req ? await TelegramChat.findOne({ chat_id: req.chat_id }) : null;

              let joinChannelUrl = targetChat?.invite_link;
              if (!joinChannelUrl && targetChat?.username) {
                joinChannelUrl = `https://t.me/${targetChat.username}`;
              }

              const welcomeMsg =
                `🎉 <b>Welcome to ${TelegramService.escapeHtml(campaign.title)}!</b>\n\n` +
                `You were personally invited by <b>${TelegramService.escapeHtml(referrerName)}</b>.\n\n` +
                `👉 <b>Next Step:</b> Join our community channel below to complete verification and unlock rewards!`;

              const joinButtons: any[] = [];
              if (joinChannelUrl) {
                joinButtons.push([{ text: `📢 Join ${targetChat?.title || 'Community Channel'}`, url: joinChannelUrl }]);
              }
              joinButtons.push([
                { text: '🔗 Get My Own Referral Link', callback_data: 'cb_get_link' },
                { text: '◀️ Main Menu', callback_data: 'cb_menu' },
              ]);

              await TelegramService.safeReply(ctx, welcomeMsg, {
                reply_markup: { inline_keyboard: joinButtons },
              });
              return;
            }
          }
        }

        const firstName = TelegramService.escapeHtml(from.first_name || 'Creator');
        const welcomeText =
          `👋 Welcome to <b>TeleGrowth — Growth & Referral Engine</b>, ${firstName}!\n\n` +
          `🚀 TeleGrowth helps Telegram channels and communities grow virally with <b>cryptographic invite tracking</b>, <b>automated anti-fraud verification</b>, and <b>instant milestone rewards</b>.\n\n` +
          `<b>✨ What would you like to do?</b>\n` +
          `• <b>How It Works:</b> Learn the 4-step referral lifecycle\n` +
          `• <b>My Invite Link:</b> Get your unique link to invite friends & earn points\n` +
          `• <b>My Stats:</b> Check your verified joins, pending hold, and points\n` +
          `• <b>Leaderboard:</b> See the top referrers across campaigns\n` +
          `• <b>Rewards:</b> View unlockable milestone gift codes & prizes\n` +
          `• <b>Add Bot:</b> Add @${config.telegram.botUsername} to your channel as admin\n\n` +
          `<i>Use the buttons below to explore, or type /help for the command list:</i>`;

        await TelegramService.safeReply(ctx, welcomeText, {
          reply_markup: TelegramService.getMainMenuKeyboard(),
        });
      } catch (err: any) {
        logger.error('Error handling /start:', { error: err.message, stack: err.stack });
        try {
          await ctx.reply(`👋 Welcome to TeleGrowth! Open your dashboard at: ${config.frontendUrl}/dashboard`);
        } catch (fallbackErr) {
          logger.error('Fallback reply failed:', fallbackErr);
        }
      }
    });

    // /howitworks & /tutorial & /guide
    bot.command(['howitworks', 'tutorial', 'guide'], async (ctx) => {
      await TelegramService.sendHowItWorksOverview(ctx);
    });

    // /link & /invitelink
    bot.command(['link', 'invitelink'], async (ctx) => {
      await TelegramService.sendInviteLink(ctx);
    });

    // /stats & /mystats & /profile
    bot.command(['stats', 'mystats', 'profile'], async (ctx) => {
      await TelegramService.sendUserStats(ctx);
    });

    // /leaderboard & /top
    bot.command(['leaderboard', 'top'], async (ctx) => {
      await TelegramService.sendLeaderboard(ctx);
    });

    // /rewards & /milestones
    bot.command(['rewards', 'milestones'], async (ctx) => {
      await TelegramService.sendRewards(ctx);
    });

    // /channels & /connect
    bot.command(['channels', 'connect'], async (ctx) => {
      await TelegramService.sendChannelsGuide(ctx);
    });

    // /rules & /antifraud
    bot.command(['rules', 'antifraud'], async (ctx) => {
      await TelegramService.sendAntiFraudRules(ctx);
    });

    // /faq
    bot.command('faq', async (ctx) => {
      await TelegramService.sendFAQ(ctx);
    });

    // /box & /mysterybox & /chest
    bot.command(['box', 'mysterybox', 'chest'], async (ctx) => {
      await TelegramService.sendMysteryBox(ctx);
    });

    // /app & /miniapp
    bot.command(['app', 'miniapp'], async (ctx) => {
      await TelegramService.sendMiniApp(ctx);
    });

    // /custombot & /bot & /mybot
    bot.command(['custombot', 'bot', 'mybot'], async (ctx) => {
      await TelegramService.sendCustomBotManager(ctx);
    });

    // /setcustombot & /connectbot
    bot.command(['setcustombot', 'connectbot'], async (ctx) => {
      await TelegramService.handleSetCustomBot(ctx);
    });

    // /disconnectbot & /disconnectcustombot
    bot.command(['disconnectbot', 'disconnectcustombot'], async (ctx) => {
      await TelegramService.handleDisconnectCustomBot(ctx);
    });

    // /dashboard
    bot.command('dashboard', async (ctx) => {
      const url = `${config.frontendUrl}/dashboard`;
      const dashBtn = this.makeWebButton('🚀 Open Dashboard', '/dashboard', 'cmd_open_dashboard');
      await TelegramService.safeReply(
        ctx,
        `🖥 <b>TeleGrowth Creator Dashboard</b>\n\nAccess your real-time analytics, campaigns, connected channels, and anti-fraud monitor:\n\n🌐 <code>${url}</code>`,
        {
          reply_markup: {
            inline_keyboard: [
              [dashBtn],
              [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        }
      );
    });

    // /campaigns
    bot.command('campaigns', async (ctx) => {
      const tgId = String(ctx.from?.id);
      const user = await User.findOne({ telegram_id: tgId });
      if (!user) return ctx.reply('Please run /start first to register.');

      const member = await WorkspaceMember.findOne({ user_id: user._id, status: 'active' });
      if (!member) return ctx.reply('No active workspace found. Run /start to initialize.');

      const campaigns = await Campaign.find({ workspace_id: member.workspace_id }).limit(10);
      if (campaigns.length === 0) {
        return TelegramService.safeReply(
          ctx,
          `You have no campaigns yet.\nUse /create or open the dashboard (${config.frontendUrl}/campaigns/new) to launch your first viral campaign!`
        );
      }

      let text = `📋 <b>Your Campaigns:</b>\n\n`;
      campaigns.forEach((c, idx) => {
        text += `${idx + 1}. <b>${TelegramService.escapeHtml(c.title)}</b>\n` +
                `   • Status: <code>${c.status.toUpperCase()}</code>\n` +
                `   • Type: ${c.type}\n` +
                `   • Total Referrals: ${c.total_referrals} (${c.verified_referrals} verified)\n\n`;
      });

      const analyticsBtn = this.makeWebButton('📊 Full Analytics', '/dashboard', 'cmd_view_analytics');
      await TelegramService.safeReply(ctx, text, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ New Campaign', callback_data: 'cmd_create_campaign' }],
            [analyticsBtn],
            [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
          ],
        },
      });
    });

    // /create
    bot.command('create', async (ctx) => {
      const url = `${config.frontendUrl}/campaigns/new`;
      const createBtn = this.makeWebButton('✨ Launch Creator Studio', '/campaigns/new', 'cmd_create_campaign');
      await TelegramService.safeReply(
        ctx,
        `🛠 <b>Launch a New Campaign</b>\n\nTo configure multi-channel requirements, milestone rewards, and giveaway rules, open Creator Studio:\n\n🌐 <code>${url}</code>`,
        {
          reply_markup: {
            inline_keyboard: [
              [createBtn],
              [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        }
      );
    });

    // /subscription
    bot.command('subscription', async (ctx) => {
      const tgId = String(ctx.from?.id);
      const user = await User.findOne({ telegram_id: tgId });
      if (!user) return ctx.reply('Please run /start first.');

      const member = await WorkspaceMember.findOne({ user_id: user._id, status: 'active' });
      const ws = member ? await Workspace.findById(member.workspace_id).populate('plan_id') : null;
      const plan: any = ws?.plan_id;

      const text =
        `💳 <b>Subscription Overview</b>\n\n` +
        `• Current Plan: <b>${plan?.name || 'Free'}</b>\n` +
        `• Active Campaigns Limit: <b>${plan?.max_active_campaigns || 1}</b>\n` +
        `• Connected Chats Limit: <b>${plan?.max_connected_chats || 1}</b>\n` +
        `• Monthly Verified Referrals: <b>${plan?.max_verified_referrals_monthly?.toLocaleString() || 100}</b>\n` +
        `• Anti-Fraud Tier: <b>${plan?.features?.anti_fraud_tier || 'basic'}</b>\n\n` +
        `Portal: ${config.frontendUrl}/billing\n\n` +
        `Upgrade anytime using Telegram Stars ⭐ or Card!`;

      const billingBtn = this.makeWebButton('🌐 View Billing Portal', '/billing', 'cmd_view_billing');
      await TelegramService.safeReply(ctx, text, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '⭐ Upgrade with Stars', callback_data: 'cmd_upgrade_stars' }],
            [billingBtn],
            [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
          ],
        },
      });
    });

    // /analytics
    bot.command('analytics', async (ctx) => {
      const url = `${config.frontendUrl}/dashboard`;
      const analyticsBtn = this.makeWebButton('📊 View Analytics', '/dashboard', 'cmd_view_analytics');
      await TelegramService.safeReply(
        ctx,
        `📈 <b>Live Campaign Analytics</b>\n\nView real-time join charts, conversion rates, and top referrers:\n\n🌐 <code>${url}</code>`,
        {
          reply_markup: {
            inline_keyboard: [
              [analyticsBtn],
              [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        }
      );
    });

    // /help
    bot.command('help', async (ctx) => {
      const text =
        `📖 <b>TeleGrowth Bot Commands Guide:</b>\n\n` +
        `<b>For Community Members & Referrers:</b>\n` +
        `• /howitworks — Step-by-step interactive visual tutorial\n` +
        `• /link — Get your unique attributed Telegram invite link\n` +
        `• /stats — View your verified joins, hold status, and points\n` +
        `• /leaderboard — View top referrers across active campaigns\n` +
        `• /rewards — Check milestone rewards and claim progress\n` +
        `• /rules — Anti-fraud guidelines & verification hold requirements\n` +
        `• /faq — Frequently asked questions & answers\n\n` +
        `<b>For Community Admins & Creators:</b>\n` +
        `• /dashboard — Open the full creator web dashboard\n` +
        `• /channels — Connect your channel or group with 1-click admin\n` +
        `• /campaigns — List all active viral growth campaigns\n` +
        `• /create — Launch a new campaign in Creator Studio\n` +
        `• /subscription — Upgrade plan limits with Telegram Stars ⭐\n` +
        `• /analytics — Live join charts and conversion telemetry\n` +
        `• /support — Contact platform support engineers\n\n` +
        `👤 <b>Lead Developer & Admin:</b> @nxproo (https://t.me/nxproo)`;

      await TelegramService.safeReply(ctx, text, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '💬 Contact Developer (@nxproo)', url: 'https://t.me/nxproo' },
              { text: '🔗 My Invite Link', callback_data: 'cb_get_link' },
            ],
            [
              { text: '📊 My Stats', callback_data: 'cb_my_stats' },
              { text: '🏆 Leaderboard', callback_data: 'cb_leaderboard' },
            ],
            [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
          ],
        },
      });
    });

    // /support & /paysupport
    bot.command(['support', 'paysupport'], async (ctx) => {
      const tgId = String(ctx.from?.id);
      const msgText = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
      const isPay = msgText.includes('paysupport');
      const category = isPay ? 'payment' : 'general';

      await SupportTicket.create({
        user_telegram_id: tgId,
        subject: isPay ? 'Payment & Billing Inquiry' : 'Customer Support Request',
        category,
        status: 'open',
        messages: [
          {
            sender_telegram_id: tgId,
            sender_role: 'user',
            message: `User requested support via Telegram bot command: ${msgText}`,
            timestamp: new Date(),
          },
        ],
      });

      await TelegramService.safeReply(
        ctx,
        `✅ <b>Support Ticket Created!</b>\n\nOur platform support engineers have received your inquiry.\n\nNeed immediate direct assistance or developer help?\n👤 <b>Lead Developer & Admin:</b> @nxproo (https://t.me/nxproo)\n\nTicket Category: <code>${category.toUpperCase()}</code>`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '💬 Message Developer (@nxproo)', url: 'https://t.me/nxproo' }],
              [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        }
      );
    });

    // ----------------------------------------------------
    // Interactive Callback Queries
    // ----------------------------------------------------
    bot.action('cb_menu', async (ctx) => {
      await ctx.answerCbQuery();
      const from = ctx.from;
      const firstName = TelegramService.escapeHtml(from?.first_name || 'Creator');
      await TelegramService.safeReply(
        ctx,
        `👋 <b>Main Menu</b> — Welcome back, <b>${firstName}</b>!\n\nSelect an option below:`,
        {
          reply_markup: TelegramService.getMainMenuKeyboard(),
        }
      );
    });

    bot.action(['cb_guide_main', 'cb_how_it_works'], async (ctx) => {
      await ctx.answerCbQuery();
      await TelegramService.sendHowItWorksOverview(ctx);
    });

    bot.action('cb_guide_creators', async (ctx) => {
      await ctx.answerCbQuery();
      await TelegramService.sendCreatorsGuide(ctx);
    });

    bot.action('cb_guide_referrers', async (ctx) => {
      await ctx.answerCbQuery();
      await TelegramService.sendReferrersGuide(ctx);
    });

    bot.action('cb_guide_antifraud', async (ctx) => {
      await ctx.answerCbQuery();
      await TelegramService.sendAntiFraudRules(ctx);
    });

    bot.action('cb_guide_rewards', async (ctx) => {
      await ctx.answerCbQuery();
      await TelegramService.sendRewards(ctx);
    });

    bot.action('cb_get_link', async (ctx) => {
      await ctx.answerCbQuery();
      await TelegramService.sendInviteLink(ctx);
    });

    bot.action('cb_refresh_link', async (ctx) => {
      await ctx.answerCbQuery('🔄 Generating fresh new invite link...');
      await TelegramService.sendInviteLink(ctx, true);
    });

    bot.action('cb_my_stats', async (ctx) => {
      await ctx.answerCbQuery();
      await TelegramService.sendUserStats(ctx);
    });

    bot.action('cb_leaderboard', async (ctx) => {
      await ctx.answerCbQuery();
      await TelegramService.sendLeaderboard(ctx);
    });

    bot.action('cb_rewards', async (ctx) => {
      await ctx.answerCbQuery();
      await TelegramService.sendRewards(ctx);
    });

    bot.action('cb_channels', async (ctx) => {
      await ctx.answerCbQuery();
      await TelegramService.sendChannelsGuide(ctx);
    });

    bot.action('cb_rules', async (ctx) => {
      await ctx.answerCbQuery();
      await TelegramService.sendAntiFraudRules(ctx);
    });

    bot.action('cb_faq', async (ctx) => {
      await ctx.answerCbQuery();
      await TelegramService.sendFAQ(ctx);
    });

    bot.action('cb_mystery_box', async (ctx) => {
      await ctx.answerCbQuery();
      await TelegramService.sendMysteryBox(ctx);
    });

    bot.action('cb_open_box', async (ctx) => {
      await TelegramService.handleOpenBoxAction(ctx);
    });

    bot.action(['cb_miniapp', 'cb_open_miniapp_info'], async (ctx) => {
      await ctx.answerCbQuery();
      const miniAppUrl = `${config.frontendUrl}/miniapp`;
      await TelegramService.safeReply(
        ctx,
        `📱 <b>TeleGrowth Mobile Mini App 2.0</b>\n\nExperience the next-gen viral referral dashboard directly inside Telegram:\n\n🌐 <code>${miniAppUrl}</code>\n\n<i>Note: On HTTPS production domains, Telegram launches this as an embedded full-screen Mini App!</i>`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🎁 Open Mystery Box', callback_data: 'cb_open_box' }],
              [{ text: '🔗 My Invite Link', callback_data: 'cb_get_link' }],
              [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        }
      );
    });

    bot.action('cb_custom_bot', async (ctx) => {
      await ctx.answerCbQuery();
      await TelegramService.sendCustomBotManager(ctx);
    });

    bot.action('cb_custom_bot_ping', async (ctx) => {
      await ctx.answerCbQuery();
      await TelegramService.handleCustomBotPingAction(ctx);
    });

    bot.action('cb_custom_bot_restart', async (ctx) => {
      await ctx.answerCbQuery();
      await TelegramService.handleCustomBotRestartAction(ctx);
    });

    bot.action('cb_custom_bot_disconnect', async (ctx) => {
      await ctx.answerCbQuery();
      await TelegramService.handleDisconnectCustomBot(ctx);
    });

    bot.action('cmd_open_dashboard', async (ctx) => {
      await ctx.answerCbQuery();
      await TelegramService.safeReply(
        ctx,
        `🖥 <b>Creator Dashboard</b>\n\nAccess your dashboard here:\n${config.frontendUrl}/dashboard`
      );
    });

    bot.action('cmd_view_analytics', async (ctx) => {
      await ctx.answerCbQuery();
      await TelegramService.safeReply(
        ctx,
        `📈 <b>Live Campaign Analytics:</b>\n${config.frontendUrl}/dashboard`
      );
    });

    bot.action('cmd_view_billing', async (ctx) => {
      await ctx.answerCbQuery();
      await TelegramService.safeReply(
        ctx,
        `💳 <b>Billing & Subscriptions Portal:</b>\n${config.frontendUrl}/billing`
      );
    });

    bot.action('cmd_create_campaign', async (ctx) => {
      await ctx.answerCbQuery();
      await TelegramService.safeReply(
        ctx,
        `🛠 <b>Launch Campaign Studio</b>\n\nConfigure viral rules and milestone rewards here:\n${config.frontendUrl}/campaigns/new`
      );
    });

    bot.action('cmd_upgrade_stars', async (ctx) => {
      await ctx.answerCbQuery();
      await TelegramService.safeReply(
        ctx,
        `⭐ <b>Upgrade with Telegram Stars</b>\n\n` +
        `Choose your tier to purchase directly inside Telegram:\n` +
        `• <b>Pro Plan</b>: 1,500 Stars / month (10 campaigns, 5k referrals)\n` +
        `• <b>Business Plan</b>: 5,000 Stars / month (50 campaigns, 50k referrals)\n\n` +
        `Checkout Portal: ${config.frontendUrl}/billing`
      );
    });

    // Handle bot being added to channel or group as admin (my_chat_member update)
    bot.on('my_chat_member', async (ctx) => {
      try {
        const update = ctx.myChatMember;
        const chat = update.chat as any;
        const newStatus = update.new_chat_member.status;

        logger.info(`my_chat_member update in chat ${chat.id} (${chat.title || 'chat'}), status: ${newStatus}`);

        if (newStatus === 'administrator') {
          const adminMember = update.new_chat_member as any;
          const canInvite = Boolean(adminMember.can_invite_users);

          const fromUser = update.from;
          const fromTgId = String(fromUser.id);
          const user = await User.findOne({ telegram_id: fromTgId });
          const member = user ? await WorkspaceMember.findOne({ user_id: user._id, status: 'active' }) : null;
          const customWsId = (ctx as any).workspaceId;
          const targetWsId = customWsId || member?.workspace_id;

          if (targetWsId) {
            await TelegramChat.findOneAndUpdate(
              { workspace_id: targetWsId, chat_id: String(chat.id) },
              {
                $set: {
                  title: chat.title || 'Telegram Chat',
                  type: chat.type === 'channel' ? 'channel' : chat.type === 'supergroup' ? 'supergroup' : 'group',
                  username: (chat as any).username,
                  is_bot_admin: true,
                  permissions: {
                    can_invite_users: canInvite,
                    can_manage_chat: Boolean(adminMember.can_manage_chat),
                    can_post_messages: Boolean(adminMember.can_post_messages),
                    can_delete_messages: Boolean(adminMember.can_delete_messages),
                  },
                  verification_status: canInvite ? 'verified' : 'permissions_missing',
                  connected_by: user ? user._id : undefined,
                  last_verified_at: new Date(),
                },
              },
              { upsert: true, new: true }
            );

            logger.info(`Chat ${chat.id} verified for workspace ${targetWsId}`);
          }
        }
      } catch (err: any) {
        logger.error('Error handling my_chat_member:', { error: err.message });
      }
    });

    // Handle chat_member updates (member joins, leaves, invite link attribution)
    bot.on('chat_member', async (ctx) => {
      try {
        const { ReferralService } = await import('../referrals/referral.service');
        await ReferralService.processChatMemberUpdate(ctx.chatMember);
      } catch (err: any) {
        logger.error('Error handling chat_member in bot listener:', { error: err.message });
      }
    });

    // Handle pre-checkout queries for Telegram Stars purchases
    bot.on('pre_checkout_query', async (ctx) => {
      try {
        await ctx.answerPreCheckoutQuery(true);
      } catch (err: any) {
        logger.error('Error answering pre_checkout_query:', { error: err.message });
      }
    });

    // Handle successful Telegram Stars payments
    bot.on('message', async (ctx, next) => {
      const sp = (ctx.message as any)?.successful_payment;
      if (sp) {
        try {
          const { SubscriptionService } = await import('../subscriptions/subscription.service');
          const payloadData = JSON.parse(sp.invoice_payload || '{}');
          if (payloadData.workspaceId && payloadData.planCode) {
            await SubscriptionService.processPaymentAndUpgrade({
              workspaceId: payloadData.workspaceId,
              userId: payloadData.userId,
              planCode: payloadData.planCode,
              billingCycle: payloadData.billingCycle || 'monthly',
              provider: 'telegram_stars',
              idempotencyKey: sp.telegram_payment_charge_id,
              telegramChargeId: sp.telegram_payment_charge_id,
            });
            await ctx.reply('⭐ Thank you for your payment! Your subscription has been upgraded successfully.');
          }
        } catch (err: any) {
          logger.error('Error processing successful_payment in bot:', { error: err.message });
        }
      }
      return next();
    });
  }

  // ----------------------------------------------------
  // Detailed Tutorial & Feature Helpers
  // ----------------------------------------------------

  /**
   * Main How It Works Overview
   */
  static async sendHowItWorksOverview(ctx: Context): Promise<void> {
    const text =
      `📖 <b>How TeleGrowth Works — The Complete Growth Guide</b>\n\n` +
      `TeleGrowth turns your Telegram channels & communities into viral referral engines with 100% accurate join attribution and fraud protection.\n\n` +
      `<b>🔄 The 4-Step Lifecycle:</b>\n\n` +
      `<b>1. 📢 Creator Connects Chat:</b>\n` +
      `The community owner adds @${config.telegram.botUsername} as an admin with <i>"Invite Users via Link"</i> permission.\n\n` +
      `<b>2. 🔗 Member Gets Unique Link:</b>\n` +
      `Members run /link to receive a cryptographic Telegram invite link tied strictly to their account.\n\n` +
      `<b>3. 🛡️ Verification & Anti-Fraud Hold:</b>\n` +
      `When friends join via the link, TeleGrowth verifies them in real time. Disposable bots and fake accounts are rejected. Honest members pass the retention hold period.\n\n` +
      `<b>4. 🎁 Rewards & Leaderboard:</b>\n` +
      `Referrers earn points, climb the community leaderboard, and automatically unlock milestone prizes (gift codes, vouchers, VIP access, giveaway tickets).\n\n` +
      `<i>Tap below for specialized role guides:</i>`;

    await this.safeReply(ctx, text, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🏗️ For Channel Owners', callback_data: 'cb_guide_creators' },
            { text: '👥 For Referrers', callback_data: 'cb_guide_referrers' },
          ],
          [
            { text: '🛡️ Anti-Fraud Rules', callback_data: 'cb_guide_antifraud' },
            { text: '🎁 Milestone Rewards', callback_data: 'cb_guide_rewards' },
          ],
          [
            { text: '❓ View FAQs', callback_data: 'cb_faq' },
            { text: '◀️ Main Menu', callback_data: 'cb_menu' },
          ],
        ],
      },
    });
  }

  /**
   * Creator Guide
   */
  static async sendCreatorsGuide(ctx: Context): Promise<void> {
    const text =
      `🏗️ <b>Creator & Channel Admin Tutorial:</b>\n\n` +
      `<b>Step 1: Add Bot to Your Channel or Group</b>\n` +
      `• Open your Telegram channel or group info.\n` +
      `• Go to <b>Administrators</b> ➔ <b>Add Admin</b>.\n` +
      `• Search for <code>@${config.telegram.botUsername}</code>.\n` +
      `• Enable <b>"Invite Users via Link"</b> (Required to generate attribution links).\n\n` +
      `<b>Step 2: Verify in Web Dashboard</b>\n` +
      `• Open ${config.frontendUrl}/channels\n` +
      `• Click <b>Verify Connection</b> or run /channels.\n\n` +
      `<b>Step 3: Create a Growth Campaign</b>\n` +
      `• Run /create or open ${config.frontendUrl}/campaigns/new\n` +
      `• Choose points per referral, retention hold days (e.g. 3 days), and anti-fraud sensitivity.\n\n` +
      `<b>Step 4: Configure Milestone Rewards & Raffles</b>\n` +
      `• Set reward milestones (e.g., 5 invites = Telegram Premium or Promo Code).\n` +
      `• TeleGrowth automatically delivers the codes via bot DM as members hit each milestone!`;

    const addBotUrl = `https://t.me/${config.telegram.botUsername}?startgroup=true&admin=invite_users`;
    await this.safeReply(ctx, text, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ Add Bot to Channel Now', url: addBotUrl }],
          [
            { text: '👥 For Referrers', callback_data: 'cb_guide_referrers' },
            { text: '🛡️ Anti-Fraud Rules', callback_data: 'cb_guide_antifraud' },
          ],
          [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
        ],
      },
    });
  }

  /**
   * Referrers Guide
   */
  static async sendReferrersGuide(ctx: Context): Promise<void> {
    const text =
      `👥 <b>Community Referrer Tutorial — How to Earn Rewards:</b>\n\n` +
      `<b>Step 1: Get Your Personal Invite Link</b>\n` +
      `• Send /link or tap <b>"My Invite Link"</b> below.\n` +
      `• TeleGrowth generates a unique Telegram link created specifically for you.\n\n` +
      `<b>Step 2: Share with Friends & Social Media</b>\n` +
      `• Share your link on Telegram, WhatsApp, Twitter/X, Discord, or blogs.\n` +
      `• When someone taps your link and joins the channel, it is attributed to you immediately.\n\n` +
      `<b>Step 3: Verification & Retention Hold</b>\n` +
      `• The new member must stay in the channel for the retention duration (e.g., 24-72 hours).\n` +
      `• Once verified, your points are confirmed and you climb the leaderboard!\n\n` +
      `<b>Step 4: Claim Your Prizes</b>\n` +
      `• Type /stats to check your points and rank.\n` +
      `• Type /rewards to see unlocked codes and milestone vouchers delivered to your chat!`;

    await this.safeReply(ctx, text, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔗 Get My Invite Link', callback_data: 'cb_get_link' },
            { text: '📊 My Stats', callback_data: 'cb_my_stats' },
          ],
          [
            { text: '🏆 View Leaderboard', callback_data: 'cb_leaderboard' },
            { text: '🎁 View Rewards', callback_data: 'cb_rewards' },
          ],
          [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
        ],
      },
    });
  }

  /**
   * Anti-Fraud & Fair Play Rules
   */
  static async sendAntiFraudRules(ctx: Context): Promise<void> {
    const text =
      `🛡️ <b>Anti-Fraud & Fair Play System:</b>\n\n` +
      `To ensure real, authentic audience growth, TeleGrowth employs a multi-tiered security engine:\n\n` +
      `• <b>⏳ Retention Hold Period:</b>\n` +
      `Referred members must remain joined in the channel for the campaign's retention period (typically 24–72 hours). If a member leaves early, the referral is automatically voided.\n\n` +
      `• <b>🤖 Bot & Disposable Account Detection:</b>\n` +
      `Accounts created recently or lacking typical human Telegram activity are flagged and quarantined.\n\n` +
      `• <b>🚫 Self-Referral Prevention:</b>\n` +
      `Joining through your own invite link or using secondary clones on the same device/IP is automatically detected and blocked.\n\n` +
      `• <b>🍯 Honeypot Traps:</b>\n` +
      `Automated scraper bots that mass-click links trigger honeypot triggers and are banned immediately.\n\n` +
      `<i>Always invite genuine users who are interested in the community!</i>`;

    await this.safeReply(ctx, text, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔗 Get My Invite Link', callback_data: 'cb_get_link' },
            { text: '📖 How It Works', callback_data: 'cb_guide_main' },
          ],
          [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
        ],
      },
    });
  }

  /**
   * Frequently Asked Questions (FAQ)
   */
  static async sendFAQ(ctx: Context): Promise<void> {
    const text =
      `❓ <b>Frequently Asked Questions (FAQ):</b>\n\n` +
      `<b>Q: Why is my referral showing as "Pending"?</b>\n` +
      `A: The campaign has a retention hold period (e.g. 24–72h). Once the new member stays in the channel for this duration, it automatically flips to <b>Verified</b> and awards points.\n\n` +
      `<b>Q: How do I claim milestone rewards?</b>\n` +
      `A: When your verified referrals reach a milestone threshold, TeleGrowth automatically delivers your reward (gift code, access link, or voucher) right here in your direct messages!\n\n` +
      `<b>Q: Can I use this for multiple channels?</b>\n` +
      `A: Yes! You can connect multiple channels and groups, each with its own customized campaign and rewards.\n\n` +
      `<b>Q: How do I upgrade my campaign limits?</b>\n` +
      `A: Community creators can upgrade using Telegram Stars ⭐ or Card in the /subscription menu or web billing portal.`;

    await this.safeReply(ctx, text, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔗 Get Invite Link', callback_data: 'cb_get_link' },
            { text: '📊 My Stats', callback_data: 'cb_my_stats' },
          ],
          [
            { text: '⭐ Upgrade Plan', callback_data: 'cmd_upgrade_stars' },
            { text: '◀️ Main Menu', callback_data: 'cb_menu' },
          ],
        ],
      },
    });
  }

  /**
   * Get or generate user's personal invite link (both Bot Referral Deep Link & Direct Channel Link)
   */
  static async sendInviteLink(ctx: Context, forceNew: boolean = false): Promise<void> {
    try {
      const tgId = String(ctx.from?.id);
      if (!tgId) return;

      // Find active campaign: first check custom bot workspace, then user's workspace, else any active public campaign
      const user = await User.findOne({ telegram_id: tgId });
      let member = user ? await WorkspaceMember.findOne({ user_id: user._id, status: 'active' }) : null;

      const customWsId = (ctx as any).workspaceId;
      let campaign = customWsId
        ? await Campaign.findOne({ workspace_id: customWsId, status: 'active' })
        : null;

      if (!campaign && member) {
        campaign = await Campaign.findOne({ workspace_id: member.workspace_id, status: 'active' });
      }

      if (!campaign) {
        campaign = await Campaign.findOne({ status: 'active' });
      }

      if (!campaign) {
        return this.safeReply(
          ctx,
          `⚠️ <b>No Active Campaign Available</b>\n\nThere are currently no active referral campaigns configured. If you are a creator, use /create to launch one!`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '➕ Create Campaign', callback_data: 'cmd_create_campaign' }],
                [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
              ],
            },
          }
        );
      }

      // Find required chat
      const requirement = await CampaignRequirement.findOne({ campaign_id: campaign._id });
      if (!requirement || !requirement.chat_id) {
        return this.safeReply(
          ctx,
          `⚠️ <b>Campaign Chat Not Connected</b>\n\nThe campaign <b>${this.escapeHtml(campaign.title)}</b> does not have a verified Telegram chat attached yet.`
        );
      }

      const { ReferralService } = await import('../referrals/referral.service');
      const [inviteLink, referralCode] = await Promise.all([
        ReferralService.getOrCreateChatInviteLink({
          workspaceId: campaign.workspace_id,
          campaignId: campaign._id,
          userTelegramId: tgId,
          chatId: requirement.chat_id,
          forceNew,
        }),
        ReferralService.getOrCreateReferralCode(
          campaign.workspace_id,
          campaign._id,
          tgId
        ),
      ]);

      const activeBotUsername = (ctx as any).customBotUsername || ctx.botInfo?.username || config.telegram.botUsername;
      const botDeepLink = `https://t.me/${activeBotUsername}?start=ref_${referralCode}`;

      const shareText = encodeURIComponent(`👋 Hey! Join ${campaign.title} on Telegram:\n${botDeepLink}`);
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(botDeepLink)}&text=${shareText}`;

      const shareChannelText = encodeURIComponent(`👋 Hey! Join ${campaign.title} channel directly:\n${inviteLink}`);
      const shareChannelUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${shareChannelText}`;

      const basePoints = campaign.reward_policy?.points_per_referral || 10;
      const premiumMult = campaign.reward_policy?.premium_multiplier || 2;
      const premiumPoints = Math.round(basePoints * premiumMult);

      const premiumBadge = premiumMult > 1
        ? `⭐ <b>Telegram Premium Bonus:</b> <b>+${premiumPoints} Points</b> (${premiumMult}x multiplier!)\n`
        : '';

      const text =
        `🎁 <b>Your Personal Referral Invite Links</b>\n\n` +
        `Campaign: <b>${this.escapeHtml(campaign.title)}</b>\n\n` +
        `💰 <b>Rewards You Earn:</b>\n` +
        `• Standard Member: <b>+${basePoints} Points</b>\n` +
        premiumBadge +
        `\n━━━━━━━━━━━━━━━━━━━━\n` +
        `🤖 <b>Option 1: One-Tap Bot Invite (Recommended)</b>\n` +
        `<code>${botDeepLink}</code>\n` +
        `<i>👉 Best for friends! They tap start, get welcomed, and join seamlessly.</i>\n\n` +
        `📢 <b>Option 2: Direct Channel Link</b>\n` +
        `<code>${inviteLink}</code>\n` +
        `<i>👉 Direct link straight into the Telegram channel.</i>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📌 <b>Simple 3-Step Guide:</b>\n` +
        `1️⃣ Tap <b>"🚀 Share with Friends"</b> below.\n` +
        `2️⃣ Pick any friend or Telegram group.\n` +
        `3️⃣ When they join, your points are automatically credited!\n\n` +
        `ℹ️ <b>Important:</b> Your invite link <b>never expires</b> and allows <b>instant direct join</b> (no admin approval needed). If you tap your own link, Telegram will show <i>"Link Expired"</i> because you are already inside this group. Share it with friends or test with another account!`;

      await this.safeReply(ctx, text, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🚀 Share with Friends', url: shareUrl },
              { text: '📢 Share Channel Link', url: shareChannelUrl },
            ],
            [
              { text: '📊 My Stats & Points', callback_data: 'cb_my_stats' },
              { text: '🏆 Leaderboard', callback_data: 'cb_leaderboard' },
            ],
            [
              { text: '❓ How It Works', callback_data: 'cb_how_it_works' },
              { text: '🔄 Refresh Link', callback_data: 'cb_refresh_link' },
            ],
            [
              { text: '◀️ Main Menu', callback_data: 'cb_menu' },
            ],
          ],
        },
      });
    } catch (err: any) {
      logger.error('Error generating invite link in bot:', { error: err.message, stack: err.stack });

      // Graceful fallback: check if user already has an existing referral code/link
      try {
        const tgId = String(ctx.from?.id);
        const { ReferralCode } = await import('../../database/models/ReferralCode');
        const existingRef = await ReferralCode.findOne({ user_telegram_id: tgId });
        if (existingRef) {
          const activeBotUsername = (ctx as any).customBotUsername || ctx.botInfo?.username || config.telegram.botUsername;
          const fallbackBotLink = `https://t.me/${activeBotUsername}?start=ref_${existingRef.referral_code}`;
          const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(fallbackBotLink)}&text=${encodeURIComponent('Join with my referral link!')}`;
          await this.safeReply(
            ctx,
            `⚠️ <b>Note:</b> We couldn't refresh a new channel link right now, but your active Bot Referral Link is ready:\n\n` +
            `<code>${fallbackBotLink}</code>\n\n` +
            `You can share this link immediately to earn points!`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🚀 Share Link', url: shareUrl }],
                  [{ text: '📊 My Stats', callback_data: 'cb_my_stats' }],
                  [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
                ],
              },
            }
          );
          return;
        }
      } catch (fallbackErr: any) {
        logger.error('Fallback link error:', { error: fallbackErr.message });
      }

      await this.safeReply(
        ctx,
        `⚠️ <b>Unable to generate invite link at this moment.</b>\n\nPlease try again in a few moments, or use /stats to check your account.`
      );
    }
  }

  /**
   * User Stats & Rank
   */
  static async sendUserStats(ctx: Context): Promise<void> {
    try {
      const tgId = String(ctx.from?.id);
      if (!tgId) return;

      const [totalCount, verifiedCount, pendingCount, referrals, userRecord] = await Promise.all([
        Referral.countDocuments({ referrer_telegram_id: tgId }),
        Referral.countDocuments({ referrer_telegram_id: tgId, status: { $in: ['verified', 'rewarded'] } }),
        Referral.countDocuments({ referrer_telegram_id: tgId, status: { $in: ['joined', 'verification_pending', 'pending'] } }),
        Referral.find({ referrer_telegram_id: tgId }),
        User.findOne({ telegram_id: tgId }),
      ]);

      const pointsEarned = referrals.reduce((sum, r) => sum + (r.points_awarded || 0), 0);
      const premiumReferralsCount = referrals.filter((r) => r.is_premium).length;

      // Compute rank among all referrers
      const topAgg = await Referral.aggregate([
        { $match: { status: { $in: ['verified', 'rewarded'] } } },
        { $group: { _id: '$referrer_telegram_id', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      const rankIndex = topAgg.findIndex((item) => item._id === tgId);
      const rankText = rankIndex >= 0 ? `#${rankIndex + 1}` : 'Unranked';

      const firstName = this.escapeHtml(ctx.from?.first_name || 'Member');
      const isPremiumSelf = Boolean((ctx.from as any)?.is_premium || userRecord?.is_premium);

      const text =
        `📊 <b>Your Personal Referral Statistics:</b>\n\n` +
        `👤 User: <b>${firstName}</b> (<code>${tgId}</code>)\n` +
        `⭐ Telegram Account: <b>${isPremiumSelf ? 'Premium Member ⭐' : 'Standard'}</b>\n` +
        `🏆 Community Rank: <b>${rankText}</b>\n\n` +
        `• <b>Total Referrals:</b> ${totalCount}\n` +
        `• <b>Verified Joins:</b> ${verifiedCount} ✅\n` +
        `• <b>Premium Joins:</b> ${premiumReferralsCount} ⭐ (Multiplier applied)\n` +
        `• <b>Pending Hold:</b> ${pendingCount} ⏳\n` +
        `• <b>Total Points:</b> ${pointsEarned} Points\n\n` +
        `💡 <i>Share your link to invite members, earn bonus points for Premium members, and unlock milestone rewards!</i>`;

      await this.safeReply(ctx, text, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔗 Get Invite Link', callback_data: 'cb_get_link' },
              { text: '🏆 Leaderboard', callback_data: 'cb_leaderboard' },
            ],
            [
              { text: '🎁 Milestone Rewards', callback_data: 'cb_rewards' },
              { text: '◀️ Main Menu', callback_data: 'cb_menu' },
            ],
          ],
        },
      });
    } catch (err: any) {
      logger.error('Error fetching user stats:', { error: err.message });
      await this.safeReply(ctx, `⚠️ Could not retrieve stats: ${err.message}`);
    }
  }

  /**
   * Top Referrers Leaderboard
   */
  static async sendLeaderboard(ctx: Context): Promise<void> {
    try {
      const topReferrers = await Referral.aggregate([
        { $match: { status: { $in: ['verified', 'rewarded'] } } },
        {
          $group: {
            _id: '$referrer_telegram_id',
            verified_count: { $sum: 1 },
            points: { $sum: '$points_awarded' },
          },
        },
        { $sort: { verified_count: -1 } },
        { $limit: 10 },
      ]);

      if (topReferrers.length === 0) {
        return this.safeReply(
          ctx,
          `🏆 <b>Community Leaderboard:</b>\n\nNo referrals have been verified yet. Be the first by grabbing your link with /link!`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔗 Get My Invite Link', callback_data: 'cb_get_link' }],
                [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
              ],
            },
          }
        );
      }

      // Fetch user names & premium status
      const tgIds = topReferrers.map((r) => r._id);
      const users = await User.find({ telegram_id: { $in: tgIds } });
      const userMap = new Map<string, { name: string; isPremium: boolean }>();
      users.forEach((u) => {
        userMap.set(u.telegram_id, {
          name: u.first_name || (u.username ? `@${u.username}` : `User ${u.telegram_id}`),
          isPremium: Boolean(u.is_premium),
        });
      });

      let text = `🏆 <b>Top Referrers Leaderboard:</b>\n\n`;
      topReferrers.forEach((entry, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
        const uInfo = userMap.get(entry._id);
        const name = this.escapeHtml(uInfo?.name || `Member ${entry._id}`);
        const premiumStar = uInfo?.isPremium ? ' ⭐' : '';
        text += `${medal} <b>${name}${premiumStar}</b>: <b>${entry.verified_count}</b> verified (${entry.points} pts)\n`;
      });

      text += `\n💡 <i>Keep inviting to climb the ranks and win top milestone rewards!</i>`;

      await this.safeReply(ctx, text, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔗 Get My Invite Link', callback_data: 'cb_get_link' },
              { text: '📊 My Stats', callback_data: 'cb_my_stats' },
            ],
            [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
          ],
        },
      });
    } catch (err: any) {
      logger.error('Error fetching leaderboard:', { error: err.message });
      await this.safeReply(ctx, `⚠️ Could not retrieve leaderboard: ${err.message}`);
    }
  }

  /**
   * Milestone Rewards & Claims
   */
  static async sendRewards(ctx: Context): Promise<void> {
    try {
      const tgId = String(ctx.from?.id);
      const verifiedCount = await Referral.countDocuments({
        referrer_telegram_id: tgId,
        status: { $in: ['verified', 'rewarded'] },
      });

      const rewards = await Reward.find({ is_active: true })
        .sort({ milestone_referrals_required: 1 })
        .limit(8);

      let text = `🎁 <b>Milestone Rewards & Prizes:</b>\n\n` +
                 `Your Verified Referrals: <b>${verifiedCount}</b> ✅\n\n`;

      if (rewards.length === 0) {
        text += `• <b>Bronze Tier:</b> 5 Verified Invites ➔ VIP Member Badge\n` +
                `• <b>Silver Tier:</b> 10 Verified Invites ➔ Premium Promo Voucher\n` +
                `• <b>Gold Tier:</b> 25 Verified Invites ➔ Secret Channel Access\n` +
                `• <b>Diamond Tier:</b> 50 Verified Invites ➔ 1-Month Telegram Premium\n\n`;
      } else {
        rewards.forEach((r) => {
          const unlocked = verifiedCount >= r.milestone_referrals_required;
          const statusIcon = unlocked ? '✅ UNLOCKED' : `🔒 Needs ${r.milestone_referrals_required - verifiedCount} more`;
          text += `• <b>${this.escapeHtml(r.name)}</b> (${r.milestone_referrals_required} invites)\n` +
                  `  Status: <code>${statusIcon}</code>\n` +
                  `  Type: ${r.type}\n\n`;
        });
      }

      text += `💡 <i>Rewards are delivered automatically to your Telegram DM as soon as your referrals hit the required milestone!</i>`;

      await this.safeReply(ctx, text, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔗 Get My Invite Link', callback_data: 'cb_get_link' },
              { text: '📊 My Stats', callback_data: 'cb_my_stats' },
            ],
            [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
          ],
        },
      });
    } catch (err: any) {
      logger.error('Error fetching rewards in bot:', { error: err.message });
      await this.safeReply(ctx, `⚠️ Could not load rewards: ${err.message}`);
    }
  }

  /**
   * Connect Channel Guide & Link
   */
  static async sendChannelsGuide(ctx: Context): Promise<void> {
    const addBotUrl = `https://t.me/${config.telegram.botUsername}?startgroup=true&admin=invite_users`;
    const text =
      `📢 <b>How to Connect Your Telegram Channel or Group:</b>\n\n` +
      `<b>1-Click Quick Add:</b>\n` +
      `Tap the button below to add @${config.telegram.botUsername} directly to your channel or group as an Administrator.\n\n` +
      `<b>Required Permissions:</b>\n` +
      `• <b>Invite Users via Link</b> (MANDATORY for referral attribution)\n` +
      `• <b>Manage Chat</b> (for member tracking)\n\n` +
      `<b>Why is invite permission required?</b>\n` +
      `TeleGrowth creates individual cryptographically-tracked invite links via Telegram Bot API so every join is attributed 100% reliably.`;

    await this.safeReply(ctx, text, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ Add @' + config.telegram.botUsername + ' as Admin', url: addBotUrl }],
          [
            { text: '🌐 View Connected Chats', callback_data: 'cmd_open_dashboard' },
            { text: '◀️ Main Menu', callback_data: 'cb_menu' },
          ],
        ],
      },
    });
  }

  /**
   * Launch bot in polling or webhook mode
   */
  static async launchBot(): Promise<void> {
    const bot = this.getBot();

    if (!config.telegram.botToken || config.telegram.botToken.includes('FakeTokenForLocalTesting')) {
      logger.warn('⚠️ No live TELEGRAM_BOT_TOKEN provided in backend/.env. Using mock bot credentials.');
      logger.warn('👉 To connect your live Telegram bot: Paste your bot token from @BotFather into backend/.env (TELEGRAM_BOT_TOKEN=...)');
      return;
    }

    try {
      const isPublicHttpsWebhook =
        config.telegram.webhookUrl &&
        config.telegram.webhookUrl.startsWith('https://') &&
        !config.telegram.webhookUrl.includes('{') &&
        !config.telegram.webhookUrl.includes('localhost') &&
        !config.telegram.webhookUrl.includes('your-domain.com');

      if (isPublicHttpsWebhook) {
        await bot.telegram.setWebhook(config.telegram.webhookUrl, {
          allowed_updates: ['message', 'callback_query', 'chat_member', 'my_chat_member', 'pre_checkout_query'],
          secret_token: config.telegram.webhookSecret || undefined,
        });
        logger.info(`🤖 Telegram Bot Webhook registered: ${config.telegram.webhookUrl}`);
      } else {
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        bot.launch({
          allowedUpdates: ['message', 'callback_query', 'chat_member', 'my_chat_member', 'pre_checkout_query'],
          dropPendingUpdates: true,
        }).catch((err) => {
          logger.error('Failed to launch Telegram bot in polling mode:', { error: err.message });
        });
        logger.info(`🤖 Central Telegram Bot @${config.telegram.botUsername} is LIVE and polling Telegram servers for commands & joins!`);
      }
    } catch (err: any) {
      logger.error('Error initializing Telegram bot connection:', { error: err.message });
    }
  }

  /**
   * Verify Bot permissions in a given chat
   */
  static async verifyChatPermissions(chatId: string, customBotToken?: string): Promise<{
    isMember: boolean;
    isAdmin: boolean;
    canInviteUsers: boolean;
    chatTitle: string;
    chatType: string;
    username?: string;
  }> {
    const telegrafInstance = customBotToken ? new Telegraf(customBotToken) : this.getBot();

    try {
      const botInfo = await telegrafInstance.telegram.getMe();
      const chatMember = await telegrafInstance.telegram.getChatMember(chatId, botInfo.id);
      const chat = await telegrafInstance.telegram.getChat(chatId);

      const isAdmin = chatMember.status === 'administrator' || chatMember.status === 'creator';
      const canInvite = isAdmin ? Boolean((chatMember as any).can_invite_users) || chatMember.status === 'creator' : false;

      return {
        isMember: chatMember.status !== 'left' && chatMember.status !== 'kicked',
        isAdmin,
        canInviteUsers: canInvite,
        chatTitle: (chat as any).title || (chat as any).first_name || 'Chat',
        chatType: chat.type,
        username: (chat as any).username,
      };
    } catch (err: any) {
      logger.warn(`Failed to verify chat ${chatId}: ${err.message}`);
      throw new Error(`Telegram error checking chat ${chatId}: ${err.message}`);
    }
  }

  /**
   * Create an individual chat invite link for referral attribution
   */
  static async createIndividualInviteLink(params: {
    chatId: string;
    name: string;
    memberLimit?: number;
    expireDate?: number;
    customBotToken?: string;
  }): Promise<string> {
    const telegrafInstance = params.customBotToken ? new Telegraf(params.customBotToken) : this.getBot();

    try {
      const invite = await telegrafInstance.telegram.createChatInviteLink(params.chatId, {
        name: params.name,
        member_limit: params.memberLimit,
        expire_date: params.expireDate,
        creates_join_request: false,
      });

      return invite.invite_link;
    } catch (err: any) {
      logger.error(`Error creating invite link in chat ${params.chatId}: ${err.message}`);
      throw new Error(`Failed to create Telegram invite link: ${err.message}`);
    }
  }

  /**
   * Check if a user is currently a member of a chat (getChatMember)
   */
  static async checkUserMembership(chatId: string, userTelegramId: string, customBotToken?: string): Promise<{
    isMember: boolean;
    status: string;
  }> {
    const telegrafInstance = customBotToken ? new Telegraf(customBotToken) : this.getBot();

    try {
      const member = await telegrafInstance.telegram.getChatMember(chatId, Number(userTelegramId));
      const validStatuses = ['creator', 'administrator', 'member', 'restricted'];
      const isMember = validStatuses.includes(member.status);
      return { isMember, status: member.status };
    } catch (err: any) {
      logger.warn(`Failed to getChatMember for user ${userTelegramId} in chat ${chatId}: ${err.message}`);
      return { isMember: false, status: 'unknown' };
    }
  }

  /**
   * Verify and connect a custom bot token
   */
  static async verifyCustomBotToken(token: string): Promise<{ botId: string; botUsername: string; firstName: string }> {
    try {
      const customBot = new Telegraf(token);
      const me = await customBot.telegram.getMe();
      return {
        botId: String(me.id),
        botUsername: me.username || '',
        firstName: me.first_name,
      };
    } catch (err: any) {
      throw new Error(`Invalid Telegram Bot Token: ${err.message}`);
    }
  }

  /**
   * Send notification or reward message to Telegram user
   */
  static async sendMessage(userTelegramId: string, message: string, customBotToken?: string): Promise<boolean> {
    const telegrafInstance = customBotToken ? new Telegraf(customBotToken) : this.getBot();
    try {
      await telegrafInstance.telegram.sendMessage(userTelegramId, message, { parse_mode: 'Markdown' });
      return true;
    } catch (err: any) {
      logger.warn(`Could not send Telegram message to ${userTelegramId}: ${err.message}`);
      return false;
    }
  }

  /**
   * Custom Bot Manager Interface inside Telegram
   */
  static async sendCustomBotManager(ctx: Context): Promise<void> {
    try {
      const tgId = String(ctx.from?.id);
      if (!tgId) return;

      const user = await User.findOne({ telegram_id: tgId });
      const member = user ? await WorkspaceMember.findOne({ user_id: user._id, status: 'active' }) : null;
      const wsId = (ctx as any).workspaceId || member?.workspace_id;

      if (!wsId) {
        return this.safeReply(
          ctx,
          `⚠️ <b>No Active Workspace Found</b>\n\nPlease launch your creator workspace first using /start or by visiting the web dashboard.`,
          { reply_markup: { inline_keyboard: [[{ text: '◀️ Main Menu', callback_data: 'cb_menu' }]] } }
        );
      }

      const connectedBot = await ConnectedBot.findOne({ workspace_id: wsId });
      const { CustomBotManager } = await import('./custom-bot.manager');
      const isRunning = CustomBotManager.isBotRunning(String(wsId));

      if (connectedBot && connectedBot.bot_username) {
        const statusBadge = isRunning ? '🟢 Live & Polling' : (connectedBot.health_status === 'error' ? '🔴 Error' : '🟡 Stopped');
        const lastChecked = connectedBot.last_health_check_at ? new Date(connectedBot.last_health_check_at).toLocaleTimeString() : 'Just now';

        const text =
          `🤖 <b>Custom Branded Telegram Bot</b>\n\n` +
          `• <b>Bot Name:</b> ${this.escapeHtml(connectedBot.first_name || 'Branded Bot')}\n` +
          `• <b>Bot Username:</b> @${connectedBot.bot_username}\n` +
          `• <b>Bot Telegram ID:</b> <code>${connectedBot.bot_id}</code>\n` +
          `• <b>Runtime Status:</b> <b>${statusBadge}</b>\n` +
          `• <b>Token Security:</b> 🔒 AES-256-GCM Encrypted\n` +
          `• <b>Last Checked:</b> ${lastChecked}\n` +
          (connectedBot.error_message ? `\n⚠️ <i>Last Error: ${this.escapeHtml(connectedBot.error_message)}</i>\n` : '') +
          `\n💡 <i>Your custom bot runs the full TeleGrowth engine! Members can generate invite links directly inside @${connectedBot.bot_username}.</i>`;

        const dashBtn = this.makeWebButton('💻 Web Settings', '/channels', 'cmd_open_dashboard');
        const botUrl = `https://t.me/${connectedBot.bot_username}`;

        return this.safeReply(ctx, text, {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '⚡ Ping & Health Test', callback_data: 'cb_custom_bot_ping' },
                { text: '🚀 Open Custom Bot', url: botUrl },
              ],
              [
                { text: '🔄 Restart Polling Daemon', callback_data: 'cb_custom_bot_restart' },
                { text: '❌ Disconnect Bot', callback_data: 'cb_custom_bot_disconnect' },
              ],
              [dashBtn, { text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        });
      } else {
        const text =
          `🤖 <b>Connect Your Custom Branded Telegram Bot</b>\n\n` +
          `White-label TeleGrowth completely under your own brand and bot identity!\n\n` +
          `<b>✨ Benefits of a Custom Bot:</b>\n` +
          `• Your own bot name, profile picture, and description\n` +
          `• Attributed links branded under @YourBot\n` +
          `• Direct Telegram channel administrator capabilities\n\n` +
          `<b>📋 Quick 3-Step Setup:</b>\n` +
          `1️⃣ Open @BotFather in Telegram and send <code>/newbot</code>\n` +
          `2️⃣ Choose a name and username (e.g. <code>@MyCommunityRefBot</code>)\n` +
          `3️⃣ Copy the API Token and connect it via:\n` +
          `<code>/setcustombot YOUR_BOT_TOKEN</code>\n\n` +
          `<i>Or manage custom bots anytime from the Web Dashboard Channels & Bots page.</i>`;

        const dashBtn = this.makeWebButton('💻 Connect on Web', '/channels', 'cmd_open_dashboard');

        return this.safeReply(ctx, text, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🤖 Open @BotFather', url: 'https://t.me/BotFather' }],
              [dashBtn, { text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        });
      }
    } catch (err: any) {
      logger.error('Error in sendCustomBotManager:', { error: err.message });
      await this.safeReply(ctx, `⚠️ Error loading custom bot manager: ${err.message}`);
    }
  }

  /**
   * Handle /setcustombot <token> command
   */
  static async handleSetCustomBot(ctx: Context): Promise<void> {
    try {
      const tgId = String(ctx.from?.id);
      if (!tgId) return;

      const user = await User.findOne({ telegram_id: tgId });
      const member = user ? await WorkspaceMember.findOne({ user_id: user._id, status: 'active' }) : null;
      if (!member) {
        return this.safeReply(ctx, `⚠️ No active workspace found. Run /start to initialize.`);
      }

      const msgText = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
      const parts = msgText.trim().split(/\s+/);
      const token = parts[1];

      if (!token || !token.includes(':')) {
        return this.safeReply(
          ctx,
          `⚠️ <b>Missing or Invalid Token</b>\n\n` +
          `Please provide your BotFather token after the command, for example:\n` +
          `<code>/setcustombot 123456789:ABCdefGhIjklMnOpQrStUvWxYz</code>\n\n` +
          `<i>You can get your token from @BotFather.</i>`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🤖 Open @BotFather', url: 'https://t.me/BotFather' }],
                [{ text: '◀️ Custom Bot Menu', callback_data: 'cb_custom_bot' }],
              ],
            },
          }
        );
      }

      await this.safeReply(ctx, `⏳ <i>Verifying token with Telegram servers and establishing secure encryption...</i>`);

      const botInfo = await this.verifyCustomBotToken(token);
      const { encrypted, iv, tag } = encryptToken(token);
      const crypto = await import('crypto');
      const webhookSecret = crypto.randomBytes(24).toString('hex');
      const wsId = String(member.workspace_id);

      await ConnectedBot.findOneAndUpdate(
        { workspace_id: wsId },
        {
          $set: {
            bot_id: botInfo.botId,
            bot_username: botInfo.botUsername,
            first_name: botInfo.firstName,
            token_encrypted: encrypted,
            token_iv: iv,
            token_tag: tag,
            webhook_secret: webhookSecret,
            is_primary: false,
            is_active: true,
            health_status: 'healthy',
            last_health_check_at: new Date(),
            error_message: null,
          },
        },
        { upsert: true, new: true }
      );

      const { CustomBotManager } = await import('./custom-bot.manager');
      const startResult = await CustomBotManager.startCustomBot(wsId, token);

      if (startResult.success) {
        const botUrl = `https://t.me/${botInfo.botUsername}`;
        await this.safeReply(
          ctx,
          `🎉 <b>Custom Bot Connected & Polling Successfully!</b>\n\n` +
          `• <b>Bot:</b> @${botInfo.botUsername} (${botInfo.firstName})\n` +
          `• <b>Bot ID:</b> <code>${botInfo.botId}</code>\n` +
          `• <b>Encryption:</b> 🔒 AES-256-GCM Secure\n` +
          `• <b>Daemon Status:</b> 🟢 Active & Polling\n\n` +
          `Your custom bot is now actively listening for commands, referral links, and member joins!`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🚀 Open Custom Bot', url: botUrl },
                  { text: '⚡ Health Check', callback_data: 'cb_custom_bot_ping' },
                ],
                [{ text: '◀️ Bot Manager', callback_data: 'cb_custom_bot' }],
              ],
            },
          }
        );
      } else {
        await this.safeReply(
          ctx,
          `⚠️ <b>Custom Bot Verified but Failed to Launch Polling:</b>\n${startResult.error}\n\nPlease check token permissions or try again.`,
          {
            reply_markup: {
              inline_keyboard: [[{ text: '◀️ Bot Manager', callback_data: 'cb_custom_bot' }]],
            },
          }
        );
      }
    } catch (err: any) {
      logger.error('Error in handleSetCustomBot:', { error: err.message });
      await this.safeReply(ctx, `❌ Failed to connect custom bot: ${err.message}`);
    }
  }

  /**
   * Diagnostic ping on custom bot
   */
  static async handleCustomBotPingAction(ctx: Context): Promise<void> {
    try {
      const tgId = String(ctx.from?.id);
      if (!tgId) return;

      const user = await User.findOne({ telegram_id: tgId });
      const member = user ? await WorkspaceMember.findOne({ user_id: user._id, status: 'active' }) : null;
      const wsId = (ctx as any).workspaceId || member?.workspace_id;

      if (!wsId) return;

      const { CustomBotManager } = await import('./custom-bot.manager');
      const result = await CustomBotManager.pingCustomBot(String(wsId));

      if (result.success) {
        await this.safeReply(
          ctx,
          `⚡ <b>Custom Bot Diagnostics: HEALTHY</b>\n\n` +
          `• <b>Bot:</b> @${result.botInfo?.username} (${result.botInfo?.first_name})\n` +
          `• <b>Telegram API Ping:</b> <code>${result.pingMs}ms</code> ⚡\n` +
          `• <b>Polling Engine:</b> 🟢 ${result.isRunning ? 'Running' : 'Restarted'}\n` +
          `• <b>Can Join Groups:</b> ${result.botInfo?.can_join_groups ? 'Yes ✅' : 'No ❌'}\n` +
          `• <b>Inline Queries:</b> ${result.botInfo?.supports_inline_queries ? 'Enabled ✅' : 'Disabled'}\n\n` +
          `Everything is connected and operational!`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🚀 Open Custom Bot', url: `https://t.me/${result.botInfo?.username}` }],
                [{ text: '◀️ Back to Bot Manager', callback_data: 'cb_custom_bot' }],
              ],
            },
          }
        );
      } else {
        await this.safeReply(
          ctx,
          `🔴 <b>Custom Bot Diagnostics: ERROR</b>\n\n` +
          `Error: ${this.escapeHtml(result.error || 'Failed to ping bot API')}\n\n` +
          `Please check that the bot token is still valid in @BotFather.`,
          {
            reply_markup: {
              inline_keyboard: [[{ text: '◀️ Back to Bot Manager', callback_data: 'cb_custom_bot' }]],
            },
          }
        );
      }
    } catch (err: any) {
      await this.safeReply(ctx, `⚠️ Ping diagnostic failed: ${err.message}`);
    }
  }

  /**
   * Restart custom bot polling daemon
   */
  static async handleCustomBotRestartAction(ctx: Context): Promise<void> {
    try {
      const tgId = String(ctx.from?.id);
      if (!tgId) return;

      const user = await User.findOne({ telegram_id: tgId });
      const member = user ? await WorkspaceMember.findOne({ user_id: user._id, status: 'active' }) : null;
      const wsId = (ctx as any).workspaceId || member?.workspace_id;
      if (!wsId) return;

      const { CustomBotManager } = await import('./custom-bot.manager');
      const startResult = await CustomBotManager.startCustomBot(String(wsId));

      if (startResult.success) {
        await this.safeReply(
          ctx,
          `🔄 <b>Custom Bot Restarted Successfully!</b>\n\nBot @${startResult.botUsername} daemon is actively polling Telegram servers.`,
          {
            reply_markup: {
              inline_keyboard: [[{ text: '◀️ Bot Manager', callback_data: 'cb_custom_bot' }]],
            },
          }
        );
      } else {
        await this.safeReply(ctx, `⚠️ Failed to restart custom bot: ${startResult.error}`);
      }
    } catch (err: any) {
      await this.safeReply(ctx, `⚠️ Restart error: ${err.message}`);
    }
  }

  /**
   * Disconnect custom bot
   */
  static async handleDisconnectCustomBot(ctx: Context): Promise<void> {
    try {
      const tgId = String(ctx.from?.id);
      if (!tgId) return;

      const user = await User.findOne({ telegram_id: tgId });
      const member = user ? await WorkspaceMember.findOne({ user_id: user._id, status: 'active' }) : null;
      const wsId = (ctx as any).workspaceId || member?.workspace_id;
      if (!wsId) return;

      const { CustomBotManager } = await import('./custom-bot.manager');
      await CustomBotManager.stopCustomBot(String(wsId));
      await ConnectedBot.findOneAndDelete({ workspace_id: wsId });

      await this.safeReply(
        ctx,
        `✅ <b>Custom Bot Disconnected & Stopped</b>\n\nYour custom bot has been stopped and its encrypted token removed from storage. You can reconnect anytime with /setcustombot.`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🤖 Reconnect Custom Bot', callback_data: 'cb_custom_bot' }],
              [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
            ],
          },
        }
      );
    } catch (err: any) {
      await this.safeReply(ctx, `⚠️ Disconnect error: ${err.message}`);
    }
  }

  /**
   * Send Mini-App launcher message
   */
  static async sendMiniApp(ctx: Context): Promise<void> {
    const miniAppUrl = `${config.frontendUrl}/miniapp`;
    const appBtn = this.makeWebButton('🚀 Launch Mini App', '/miniapp', 'cb_open_miniapp_info');
    const text =
      `📱 <b>TeleGrowth Mobile Mini App 2.0</b>\n\n` +
      `Experience the next-gen viral referral dashboard directly inside Telegram with real-time haptic feedback, live mystery vaults, and instant leaderboards:\n\n` +
      `🌐 <code>${miniAppUrl}</code>`;

    await this.safeReply(ctx, text, {
      reply_markup: {
        inline_keyboard: [
          [appBtn],
          [{ text: '🎁 Open Mystery Box', callback_data: 'cb_open_box' }],
          [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
        ],
      },
    });
  }

  /**
   * Send Gamified Mystery Vault overview
   */
  static async sendMysteryBox(ctx: Context): Promise<void> {
    try {
      const tgId = String(ctx.from?.id);
      if (!tgId) return;

      const { GamificationService } = await import('../gamification/gamification.service');
      const profile = await GamificationService.getUserProfile(tgId);
      const appBtn = this.makeWebButton('📱 Open in Mini App', '/miniapp', 'cb_open_miniapp_info');

      const text =
        `🎁 <b>TeleGrowth Mystery Vault & Loot Chests</b>\n\n` +
        `Unlock secret loot boxes by inviting friends to the community! Every <b>3 verified referrals</b> gives you a Mystery Chest.\n\n` +
        `📦 <b>Vault Status:</b>\n` +
        `• Unopened Chests: <b>${profile.unopenedCount} Ready to Open</b>\n` +
        `• Progress to Next Chest: <b>${profile.progressToNextBox.current}/3 Invites</b> (${profile.progressToNextBox.percent}%)\n` +
        `• Active Viral Streak: <b>🔥 ${profile.streakDays} Days</b>\n\n` +
        `💎 <b>Potential Loot:</b>\n` +
        `• <b>Cyber Chest:</b> ⚡ 3x Point Multiplier Boost\n` +
        `• <b>Gold Chest:</b> 💎 +100 Ultra Points Jackpot\n` +
        `• <b>Silver/Bronze:</b> +25 to +50 Growth Points & Badges\n\n` +
        `<i>Tap below to crack open your available chest or launch the Mini-App!</i>`;

      const buttons: any[] = [];
      if (profile.unopenedCount > 0) {
        buttons.push([{ text: `🎁 Open Mystery Chest (${profile.unopenedCount} ready)`, callback_data: 'cb_open_box' }]);
      }
      buttons.push([
        appBtn,
        { text: '🔗 Get Invite Link', callback_data: 'cb_get_link' },
      ]);
      buttons.push([{ text: '◀️ Main Menu', callback_data: 'cb_menu' }]);

      await this.safeReply(ctx, text, {
        reply_markup: { inline_keyboard: buttons },
      });
    } catch (err: any) {
      logger.error('Error in sendMysteryBox:', { error: err.message });
      await this.safeReply(ctx, `⚠️ Could not load Mystery Vault right now: ${err.message}`);
    }
  }

  /**
   * Handle Open Mystery Box Action
   */
  static async handleOpenBoxAction(ctx: Context): Promise<void> {
    try {
      const tgId = String(ctx.from?.id);
      if (!tgId) return;

      const { GamificationService } = await import('../gamification/gamification.service');
      const result = await GamificationService.openBox(tgId);

      if (!result.success || !result.box) {
        await ctx.answerCbQuery('❌ No unopened chests available!', { show_alert: true });
        return;
      }

      await ctx.answerCbQuery('🎉 Chest Unlocked!', { show_alert: false });

      const celebratoryMsg =
        `🎉 <b>MYSTERY CHEST UNLOCKED!</b> 🎁\n\n` +
        `You opened a <b>${result.box.box_tier.toUpperCase()} TIER</b> chest and revealed:\n\n` +
        `✨ <b>${result.box.reward_title}</b> ✨\n\n` +
        `💰 <b>Your reward has been credited to your account balance!</b>\n` +
        `Invite 3 more friends to unlock your next chest!`;

      await this.safeReply(ctx, celebratoryMsg, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎁 View Vault', callback_data: 'cb_mystery_box' }],
            [{ text: '🔗 Share Link to Earn More', callback_data: 'cb_get_link' }],
            [{ text: '◀️ Main Menu', callback_data: 'cb_menu' }],
          ],
        },
      });
    } catch (err: any) {
      logger.error('Error opening mystery box:', { error: err.message });
      await ctx.answerCbQuery('⚠️ Error opening chest', { show_alert: true });
    }
  }
}
