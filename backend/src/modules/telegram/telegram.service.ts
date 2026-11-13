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
        let isNew = false;
        if (!user) {
          isNew = true;
          user = await User.create({
            telegram_id: telegramId,
            first_name: from.first_name,
            last_name: from.last_name || '',
            username: from.username,
            role: telegramId === config.superAdmin.telegramId ? 'superadmin' : 'user',
            is_active: true,
          });

          // Create workspace
          const freePlan = await SubscriptionPlan.findOne({ code: 'free' });
          if (freePlan) {
            const workspace = await Workspace.create({
              name: `${from.first_name}'s Workspace`,
              slug: `ws-${telegramId}-${Date.now().toString(36)}`,
              owner_id: user._id,
              owner_telegram_id: telegramId,
              plan_id: freePlan._id,
              status: 'active',
            });

            await WorkspaceMember.create({
              workspace_id: workspace._id,
              user_id: user._id,
              user_telegram_id: telegramId,
              role: 'owner',
              status: 'active',
            });

            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            await Subscription.create({
              workspace_id: workspace._id,
              plan_id: freePlan._id,
              status: 'active',
              current_period_start: new Date(),
              current_period_end: nextMonth,
              payment_provider: 'manual',
            });
          }
        }

        // Handle referral deep link if user joined through a campaign referral link
        if (startPayload && startPayload.startsWith('ref_')) {
          const code = startPayload.replace('ref_', '');
          const refRecord = await ReferralCode.findOne({ referral_code: code });
          if (refRecord) {
            // Record referral start click
            refRecord.clicks_count += 1;
            await refRecord.save();

            const campaign = await Campaign.findById(refRecord.campaign_id);
            if (campaign) {
              const welcomeMsg = campaign.branding?.welcome_message ||
                `🎉 Welcome to **${campaign.title}**!\n\nYou joined via an invitation. Make sure to stay in the channel to earn your rewards!`;
              await ctx.replyWithMarkdown(welcomeMsg);
            }
          }
        }

        const dashboardUrl = `${config.frontendUrl}/dashboard`;
        const welcomeText =
          `👋 Welcome to **Telegram Referral & Giveaway SaaS**, ${from.first_name}!\n\n` +
          `🚀 Supercharge your channels & groups with viral growth campaigns, referral milestones, automated rewards, and provably-fair giveaways.\n\n` +
          `**Available Commands:**\n` +
          `• /dashboard — Access your management dashboard\n` +
          `• /campaigns — List and view your active campaigns\n` +
          `• /create — Launch a new referral or giveaway campaign\n` +
          `• /subscription — Manage your SaaS plan & upgrade with Telegram Stars\n` +
          `• /analytics — Check growth metrics and referral stats\n` +
          `• /help — Setup instructions and bot permissions guide\n` +
          `• /support — Create a support inquiry\n` +
          `• /paysupport — Inquire regarding billing and Telegram Stars`;

        await ctx.replyWithMarkdown(welcomeText, {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '📊 Open Web Dashboard', web_app: { url: dashboardUrl } },
              ],
              [
                { text: '➕ Create Campaign', callback_data: 'cmd_create_campaign' },
                { text: '⭐ Upgrade Plan', callback_data: 'cmd_upgrade_plan' },
              ],
            ],
          },
        });
      } catch (err: any) {
        logger.error('Error handling /start:', { error: err.message });
        await ctx.reply('An error occurred during onboarding. Please try again.');
      }
    });

    // /dashboard
    bot.command('dashboard', async (ctx) => {
      const url = `${config.frontendUrl}/dashboard`;
      await ctx.replyWithMarkdown(
        `🖥 **Creator Dashboard**\n\nClick the button below to launch your Web Dashboard directly inside Telegram:`,
        {
          reply_markup: {
            inline_keyboard: [[{ text: '🚀 Open Dashboard', web_app: { url } }]],
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
      if (!member) return ctx.reply('No active workspace found.');

      const campaigns = await Campaign.find({ workspace_id: member.workspace_id }).limit(10);
      if (campaigns.length === 0) {
        return ctx.replyWithMarkdown(
          `You have no campaigns yet.\nUse /create or open the dashboard to launch your first viral campaign!`
        );
      }

      let text = `📋 **Your Campaigns:**\n\n`;
      campaigns.forEach((c, idx) => {
        text += `${idx + 1}. **${c.title}**\n` +
                `   • Status: \`${c.status.toUpperCase()}\`\n` +
                `   • Type: ${c.type}\n` +
                `   • Total Referrals: ${c.total_referrals} (${c.verified_referrals} verified)\n\n`;
      });

      await ctx.replyWithMarkdown(text, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ New Campaign', callback_data: 'cmd_create_campaign' }],
            [{ text: '📊 Full Analytics', web_app: { url: `${config.frontendUrl}/analytics` } }],
          ],
        },
      });
    });

    // /create
    bot.command('create', async (ctx) => {
      const url = `${config.frontendUrl}/campaigns/new`;
      await ctx.replyWithMarkdown(
        `🛠 **Launch a New Campaign**\n\nTo configure multi-channel requirements, milestone rewards, and giveaway rules, use the Web Creator Studio:`,
        {
          reply_markup: {
            inline_keyboard: [[{ text: '✨ Launch Creator Studio', web_app: { url } }]],
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
        `💳 **Subscription Overview**\n\n` +
        `• Current Plan: **${plan?.name || 'Free'}**\n` +
        `• Active Campaigns Limit: **${plan?.max_active_campaigns || 1}**\n` +
        `• Connected Chats Limit: **${plan?.max_connected_chats || 1}**\n` +
        `• Monthly Verified Referrals: **${plan?.max_verified_referrals_monthly?.toLocaleString() || 100}**\n` +
        `• Anti-Fraud Tier: **${plan?.features?.anti_fraud_tier || 'basic'}**\n\n` +
        `Upgrade anytime using Telegram Stars ⭐ or Card!`;

      await ctx.replyWithMarkdown(text, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '⭐ Upgrade with Stars', callback_data: 'cmd_upgrade_stars' }],
            [{ text: '🌐 View Billing Portal', web_app: { url: `${config.frontendUrl}/billing` } }],
          ],
        },
      });
    });

    // /analytics
    bot.command('analytics', async (ctx) => {
      const url = `${config.frontendUrl}/analytics`;
      await ctx.replyWithMarkdown(
        `📈 **Live Campaign Analytics**\n\nView real-time join charts, conversion rates, and top referrers:`,
        {
          reply_markup: {
            inline_keyboard: [[{ text: '📊 View Analytics', web_app: { url } }]],
          },
        }
      );
    });

    // /help
    bot.command('help', async (ctx) => {
      const text =
        `📖 **How to Connect Your Telegram Channel or Group:**\n\n` +
        `1. Open your Channel or Group settings in Telegram.\n` +
        `2. Go to **Administrators** > **Add Admin**.\n` +
        `3. Search for @${config.telegram.botUsername} and add it.\n` +
        `4. Ensure the **"Invite Users via Link"** permission is **ENABLED**.\n` +
        `5. Open your Dashboard, navigate to **Connected Chats**, and click **Verify Connection**.\n\n` +
        `💡 *Why is invite permission required?*\n` +
        `The platform generates unique invite links for every participant so that each member's referrals are tracked 100% accurately without spoofing.`;

      await ctx.replyWithMarkdown(text);
    });

    // /support & /paysupport
    bot.command(['support', 'paysupport'], async (ctx) => {
      const tgId = String(ctx.from?.id);
      const isPay = ctx.message.text.includes('paysupport');
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
            message: `User requested support via Telegram bot command ${ctx.message.text}`,
            timestamp: new Date(),
          },
        ],
      });

      await ctx.replyWithMarkdown(
        `✅ Support ticket created!\nOur support engineers have received your inquiry and will contact you directly here on Telegram.`
      );
    });

    // Callback queries
    bot.action('cmd_create_campaign', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.replyWithMarkdown(
        `Click below to launch the Campaign Studio:`,
        {
          reply_markup: {
            inline_keyboard: [[{ text: '➕ Launch Studio', web_app: { url: `${config.frontendUrl}/campaigns/new` } }]],
          },
        }
      );
    });

    bot.action('cmd_upgrade_stars', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.replyWithMarkdown(
        `⭐ **Upgrade with Telegram Stars**\n\n` +
        `Choose your tier to purchase directly inside Telegram:\n` +
        `• **Pro Plan**: 1,500 Stars / month (10 campaigns, 5k referrals)\n` +
        `• **Business Plan**: 5,000 Stars / month (50 campaigns, 50k referrals)\n\n` +
        `Open the billing dashboard to checkout instantly:`,
        {
          reply_markup: {
            inline_keyboard: [[{ text: '⭐ Checkout with Stars', web_app: { url: `${config.frontendUrl}/billing` } }]],
          },
        }
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
