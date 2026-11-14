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
  SupportTicket,
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
   * Initialize central Telegram SaaS Bot
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
  private static setupBotHandlers(bot: Telegraf): void {
    // Error handler
    bot.catch((err: any, ctx: Context) => {
      logger.error(`Telegram Bot Error for ${ctx.updateType}:`, { error: err.message });
    });

    // /start command - supports onboarding and referral deep linking
    bot.start(async (ctx) => {
      try {
        const from = ctx.from;
        if (!from) return;

        const telegramId = String(from.id);
        const startPayload = ctx.payload; // e.g. /start ref_xyz or campaign_123

        // Find or create user
        let user = await User.findOne({ telegram_id: telegramId });
        if (!user) {
          user = await User.create({
            telegram_id: telegramId,
            first_name: from.first_name || 'Creator',
            last_name: from.last_name || '',
            username: from.username,
            role: telegramId === config.superAdmin.telegramId ? 'superadmin' : 'user',
            is_active: true,
          });
        }

        // Ensure user has at least one active workspace
        let member = await WorkspaceMember.findOne({ user_id: user._id, status: 'active' });
        if (!member) {
          const isSuper = user.role === 'superadmin' || telegramId === config.superAdmin.telegramId;
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
              `Welcome, <b>${firstName}</b>! You are now securely logged into <b>TeleGrowth SaaS</b>.\n\n` +
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
              const welcomeMsg =
                campaign.branding?.welcome_message ||
                `🎉 Welcome to <b>${TelegramService.escapeHtml(campaign.title)}</b>!\n\nYou joined via an invitation. Make sure to stay in the channel to earn your rewards!`;
              await TelegramService.safeReply(ctx, welcomeMsg);
            }
          }
        }

        const dashboardUrl = `${config.frontendUrl}/dashboard`;
        const firstName = TelegramService.escapeHtml(from.first_name || 'Creator');
        const welcomeText =
          `👋 Welcome to <b>TeleGrowth SaaS</b>, ${firstName}!\n\n` +
          `🚀 Supercharge your channels & groups with viral growth campaigns, referral milestones, automated rewards, and provably-fair giveaways.\n\n` +
          `🖥 <b>Web Dashboard:</b> ${dashboardUrl}\n\n` +
          `<b>Available Commands:</b>\n` +
          `• /dashboard — Access your management dashboard\n` +
          `• /campaigns — List and view your active campaigns\n` +
          `• /create — Launch a new referral or giveaway campaign\n` +
          `• /subscription — Manage your SaaS plan & upgrade with Telegram Stars\n` +
          `• /analytics — Check growth metrics and referral stats\n` +
          `• /help — Setup instructions and bot permissions guide\n` +
          `• /support — Create a support inquiry\n` +
          `• /paysupport — Inquire regarding billing and Telegram Stars`;

        const dashBtn = this.makeWebButton('📊 Open Web Dashboard', '/dashboard', 'cmd_open_dashboard');

        await TelegramService.safeReply(ctx, welcomeText, {
          reply_markup: {
            inline_keyboard: [
              [dashBtn],
              [
                { text: '➕ Create Campaign', callback_data: 'cmd_create_campaign' },
                { text: '⭐ Upgrade Plan', callback_data: 'cmd_upgrade_stars' },
              ],
            ],
          },
        });
      } catch (err: any) {
        logger.error('Error handling /start:', { error: err.message, stack: err.stack });
        try {
          await ctx.reply(`👋 Welcome to TeleGrowth SaaS! Open your dashboard at: ${config.frontendUrl}/dashboard`);
        } catch (fallbackErr) {
          logger.error('Fallback reply failed:', fallbackErr);
        }
      }
    });

    // /dashboard
    bot.command('dashboard', async (ctx) => {
      const url = `${config.frontendUrl}/dashboard`;
      const dashBtn = this.makeWebButton('🚀 Open Dashboard', '/dashboard', 'cmd_open_dashboard');
      await TelegramService.safeReply(
        ctx,
        `🖥 <b>Creator Dashboard</b>\n\nLink: ${url}\n\nClick below to launch:`,
        {
          reply_markup: {
            inline_keyboard: [[dashBtn]],
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
        `🛠 <b>Launch a New Campaign</b>\n\nLink: ${url}\n\nTo configure multi-channel requirements, milestone rewards, and giveaway rules, open Creator Studio:`,
        {
          reply_markup: {
            inline_keyboard: [[createBtn]],
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
        `📈 <b>Live Campaign Analytics</b>\n\nLink: ${url}\n\nView real-time join charts, conversion rates, and top referrers:`,
        {
          reply_markup: {
            inline_keyboard: [[analyticsBtn]],
          },
        }
      );
    });

    // /help
    bot.command('help', async (ctx) => {
      const text =
        `📖 <b>How to Connect Your Telegram Channel or Group:</b>\n\n` +
        `1. Open your Channel or Group settings in Telegram.\n` +
        `2. Go to <b>Administrators</b> > <b>Add Admin</b>.\n` +
        `3. Search for @${config.telegram.botUsername} and add it.\n` +
        `4. Ensure the <b>"Invite Users via Link"</b> permission is <b>ENABLED</b>.\n` +
        `5. Open your Dashboard (${config.frontendUrl}/channels), navigate to <b>Connected Chats</b>, and click <b>Verify Connection</b>.\n\n` +
        `💡 <i>Why is invite permission required?</i>\n` +
        `The platform generates unique invite links for every participant so that each member's referrals are tracked 100% accurately without spoofing.`;

      await TelegramService.safeReply(ctx, text);
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
            message: `User requested support via Telegram bot command ${msgText}`,
            timestamp: new Date(),
          },
        ],
      });

      await TelegramService.safeReply(
        ctx,
        `✅ Support ticket created!\nOur support engineers have received your inquiry and will contact you directly here on Telegram.`
      );
    });

    // Callback queries
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
        const botId = String(ctx.botInfo.id);

        logger.info(`my_chat_member update in chat ${chat.id} (${chat.title || 'chat'}), status: ${newStatus}`);

        if (newStatus === 'administrator') {
          const adminMember = update.new_chat_member as any;
          const canInvite = Boolean(adminMember.can_invite_users);

          // Find if this chat was registered or needs to be updated
          const fromUser = update.from;
          const fromTgId = String(fromUser.id);
          const user = await User.findOne({ telegram_id: fromTgId });
          const member = user ? await WorkspaceMember.findOne({ user_id: user._id, status: 'active' }) : null;

          if (member) {
            await TelegramChat.findOneAndUpdate(
              { workspace_id: member.workspace_id, chat_id: String(chat.id) },
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
                  connected_by: user!._id,
                  last_verified_at: new Date(),
                },
              },
              { upsert: true, new: true }
            );

            logger.info(`Chat ${chat.id} verified for workspace ${member.workspace_id}`);
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
        logger.info(`🤖 Telegram SaaS Bot @${config.telegram.botUsername} is LIVE and polling Telegram servers for commands & joins!`);
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
}
