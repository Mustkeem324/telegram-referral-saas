import { TelegramService } from './modules/telegram/telegram.service';
import { connectDatabase } from './database/connection';
import { config } from './config';
import { logger } from './utils/logger';

async function startBotService() {
  await connectDatabase();
  logger.info('Bot service connected to MongoDB');

  const bot = TelegramService.getBot();

  if (!config.telegram.botToken || config.telegram.botToken.includes('FakeTokenForLocalTesting')) {
    logger.warn('⚠️ No real TELEGRAM_BOT_TOKEN provided in backend/.env.');
    logger.warn('👉 To activate live Telegram polling: Open backend/.env and replace TELEGRAM_BOT_TOKEN with your token from @BotFather.');
    logger.info('Bot service is running and listening. Once token is added in .env, it will connect immediately.');
    return;
  }

  try {
    await bot.telegram.deleteWebhook({ drop_pending_updates: true });
    logger.info(`Starting Telegram bot @${config.telegram.botUsername} with allowed_updates: ['message', 'callback_query', 'chat_member', 'my_chat_member', 'pre_checkout_query']`);

    await bot.launch({
      allowedUpdates: ['message', 'callback_query', 'chat_member', 'my_chat_member', 'pre_checkout_query'],
      dropPendingUpdates: true,
    });

    const me = await bot.telegram.getMe();
    logger.info(`🚀 Central Telegram SaaS Bot @${me.username} (ID: ${me.id}) is now ONLINE and listening for commands!`);
  } catch (err: any) {
    logger.error('Failed to launch Telegram bot:', { error: err.message });
  }
}

// Graceful stop
process.once('SIGINT', () => {
  const bot = TelegramService.getBot();
  bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
  const bot = TelegramService.getBot();
  bot.stop('SIGTERM');
});

startBotService().catch((err) => {
  logger.error('Fatal error in bot service:', err);
  process.exit(1);
});
