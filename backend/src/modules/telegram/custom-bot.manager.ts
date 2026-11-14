import { Telegraf } from 'telegraf';
import { logger } from '../../utils/logger';
import { decryptToken } from '../../utils/crypto';
import { ConnectedBot, Workspace } from '../../database/models';
import { TelegramService } from './telegram.service';

interface ActiveBotRecord {
  bot: Telegraf;
  startedAt: Date;
  botUsername: string;
  botId: string;
  workspaceId: string;
}

export class CustomBotManager {
  private static activeBots: Map<string, ActiveBotRecord> = new Map();

  /**
   * Check if a custom bot is actively running for a workspace
   */
  static isBotRunning(workspaceId: string): boolean {
    return this.activeBots.has(String(workspaceId));
  }

  /**
   * Get count of running custom bots
   */
  static getActiveBotCount(): number {
    return this.activeBots.size;
  }

  /**
   * Get active bot details for a workspace
   */
  static getRunningBotInfo(workspaceId: string): { isRunning: boolean; startedAt?: Date; botUsername?: string; botId?: string } {
    const record = this.activeBots.get(String(workspaceId));
    if (!record) {
      return { isRunning: false };
    }
    return {
      isRunning: true,
      startedAt: record.startedAt,
      botUsername: record.botUsername,
      botId: record.botId,
    };
  }

  /**
   * Start and launch a custom bot instance in long-polling mode
   */
  static async startCustomBot(
    workspaceId: string,
    plainToken?: string
  ): Promise<{ success: boolean; botUsername: string; botId: string; error?: string }> {
    const wsIdStr = String(workspaceId);

    // If bot already running, stop previous instance cleanly first
    if (this.activeBots.has(wsIdStr)) {
      await this.stopCustomBot(wsIdStr);
    }

    try {
      let token = plainToken;

      if (!token) {
        const botRecord = await ConnectedBot.findOne({ workspace_id: wsIdStr, is_active: true });
        if (!botRecord || !botRecord.token_encrypted || !botRecord.token_iv || !botRecord.token_tag) {
          throw new Error('No encrypted token found for workspace custom bot.');
        }
        token = decryptToken(botRecord.token_encrypted, botRecord.token_iv, botRecord.token_tag);
      }

      if (!token || !token.includes(':')) {
        throw new Error('Invalid bot token format.');
      }

      const bot = new Telegraf(token);

      // Verify token with Telegram Bot API
      const me = await bot.telegram.getMe();
      const botUsername = me.username || '';
      const botId = String(me.id);

      // Attach workspace identification middleware so commands & updates know their workspace
      bot.use(async (ctx, next) => {
        (ctx as any).workspaceId = wsIdStr;
        (ctx as any).isCustomBot = true;
        (ctx as any).customBotUsername = botUsername;
        return next();
      });

      // Attach all command handlers, anti-fraud verifiers, callbacks, and chat member listeners
      TelegramService.setupBotHandlers(bot);

      // Clear any conflicting webhooks before starting long-polling
      try {
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
      } catch (whErr: any) {
        logger.warn(`Could not clear webhook for custom bot @${botUsername}: ${whErr.message}`);
      }

      // Launch long-polling
      bot.launch({
        allowedUpdates: ['message', 'callback_query', 'chat_member', 'my_chat_member', 'pre_checkout_query'],
        dropPendingUpdates: true,
      }).catch((launchErr: any) => {
        logger.error(`Runtime polling error for custom bot @${botUsername} (ws: ${wsIdStr}):`, {
          error: launchErr.message,
        });
        this.activeBots.delete(wsIdStr);
        ConnectedBot.updateOne(
          { workspace_id: wsIdStr },
          { $set: { health_status: 'error', error_message: launchErr.message } }
        ).catch(() => {});
      });

      // Save to active in-memory registry
      this.activeBots.set(wsIdStr, {
        bot,
        startedAt: new Date(),
        botUsername,
        botId,
        workspaceId: wsIdStr,
      });

      // Update MongoDB record
      await ConnectedBot.findOneAndUpdate(
        { workspace_id: wsIdStr },
        {
          $set: {
            bot_id: botId,
            bot_username: botUsername,
            first_name: me.first_name,
            is_active: true,
            health_status: 'healthy',
            last_health_check_at: new Date(),
            error_message: null,
          },
        },
        { upsert: true }
      );

      logger.info(`🤖 Custom Bot @${botUsername} (ID: ${botId}) is LIVE and polling for workspace ${wsIdStr}!`);
      return { success: true, botUsername, botId };
    } catch (err: any) {
      logger.error(`Failed to start custom bot for workspace ${wsIdStr}:`, { error: err.message });
      await ConnectedBot.updateOne(
        { workspace_id: wsIdStr },
        { $set: { health_status: 'error', error_message: err.message, last_health_check_at: new Date() } }
      ).catch(() => {});
      return { success: false, botUsername: '', botId: '', error: err.message };
    }
  }

  /**
   * Stop an active custom bot cleanly
   */
  static async stopCustomBot(workspaceId: string): Promise<boolean> {
    const wsIdStr = String(workspaceId);
    const record = this.activeBots.get(wsIdStr);
    if (!record) {
      return false;
    }

    try {
      record.bot.stop('BOT_DISCONNECTED');
      this.activeBots.delete(wsIdStr);
      await ConnectedBot.updateOne(
        { workspace_id: wsIdStr },
        { $set: { health_status: 'stopped', last_health_check_at: new Date() } }
      );
      logger.info(`🛑 Custom Bot @${record.botUsername} stopped for workspace ${wsIdStr}.`);
      return true;
    } catch (err: any) {
      logger.error(`Error stopping custom bot for workspace ${wsIdStr}:`, { error: err.message });
      this.activeBots.delete(wsIdStr);
      return false;
    }
  }

  /**
   * Ping and diagnose custom bot health
   */
  static async pingCustomBot(workspaceId: string): Promise<{
    success: boolean;
    pingMs: number;
    botInfo?: any;
    isRunning: boolean;
    error?: string;
  }> {
    const wsIdStr = String(workspaceId);
    const start = Date.now();

    try {
      const botRecord = await ConnectedBot.findOne({ workspace_id: wsIdStr });
      if (!botRecord) {
        return { success: false, pingMs: 0, isRunning: false, error: 'No custom bot configured for this workspace.' };
      }

      if (!botRecord.token_encrypted || !botRecord.token_iv || !botRecord.token_tag) {
        return { success: false, pingMs: 0, isRunning: false, error: 'Custom bot token is missing or corrupted.' };
      }

      const token = decryptToken(botRecord.token_encrypted, botRecord.token_iv, botRecord.token_tag);
      const testBot = new Telegraf(token);
      const me = await testBot.telegram.getMe();
      const pingMs = Date.now() - start;

      const isRunning = this.isBotRunning(wsIdStr);

      // If token is valid but bot was not running, auto-start it!
      if (botRecord.is_active && !isRunning) {
        this.startCustomBot(wsIdStr, token).catch((e) => logger.warn(`Auto-start failed during ping: ${e.message}`));
      }

      await ConnectedBot.updateOne(
        { workspace_id: wsIdStr },
        { $set: { health_status: 'healthy', last_health_check_at: new Date(), error_message: null } }
      );

      return {
        success: true,
        pingMs,
        isRunning: true,
        botInfo: {
          id: me.id,
          username: me.username,
          first_name: me.first_name,
          can_join_groups: me.can_join_groups,
          can_read_all_group_messages: me.can_read_all_group_messages,
          supports_inline_queries: me.supports_inline_queries,
        },
      };
    } catch (err: any) {
      const pingMs = Date.now() - start;
      logger.warn(`Custom bot ping failed for workspace ${wsIdStr}: ${err.message}`);
      await ConnectedBot.updateOne(
        { workspace_id: wsIdStr },
        { $set: { health_status: 'error', error_message: err.message, last_health_check_at: new Date() } }
      ).catch(() => {});
      return { success: false, pingMs, isRunning: false, error: err.message };
    }
  }

  /**
   * Launch all configured and active custom bots on system boot
   */
  static async launchAllActiveBots(): Promise<void> {
    try {
      const activeBotRecords = await ConnectedBot.find({ is_active: true });
      logger.info(`🔍 Found ${activeBotRecords.length} active custom creator bot(s) to initialize...`);

      let launchedCount = 0;
      for (const botRecord of activeBotRecords) {
        try {
          if (!botRecord.token_encrypted || !botRecord.token_iv || !botRecord.token_tag) {
            continue;
          }
          const token = decryptToken(botRecord.token_encrypted, botRecord.token_iv, botRecord.token_tag);
          const res = await this.startCustomBot(String(botRecord.workspace_id), token);
          if (res.success) {
            launchedCount++;
          }
        } catch (botErr: any) {
          logger.error(`Could not launch custom bot for workspace ${botRecord.workspace_id}:`, {
            error: botErr.message,
          });
        }
      }

      logger.info(`🚀 Successfully launched and polling ${launchedCount}/${activeBotRecords.length} custom creator bot(s)!`);
    } catch (err: any) {
      logger.error('Error during CustomBotManager.launchAllActiveBots:', { error: err.message });
    }
  }
}
