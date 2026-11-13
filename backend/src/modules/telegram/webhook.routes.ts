import { Router } from 'express';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { WebhookEvent, ConnectedBot } from '../../database/models';
import { ReferralService } from '../referrals/referral.service';
import { TelegramService } from './telegram.service';
import { SubscriptionService } from '../subscriptions/subscription.service';

const router = Router();

// Primary Central Telegram Bot Webhook
router.post('/telegram', async (req, res) => {
  try {
    const secretToken = req.headers['x-telegram-bot-api-secret-token'];
    if (config.env === 'production' && config.telegram.webhookSecret) {
      if (secretToken !== config.telegram.webhookSecret) {
        logger.warn('Unauthorized webhook request - invalid secret token');
        return res.status(403).json({ error: 'Unauthorized webhook' });
      }
    }

    const update = req.body;
    if (!update || !update.update_id) {
      return res.status(400).json({ error: 'Invalid update payload' });
    }

    // Idempotency Check
    const updateId = String(update.update_id);
    const existing = await WebhookEvent.findOne({ provider: 'telegram', event_id: updateId });
    if (existing) {
      return res.status(200).json({ ok: true, note: 'already processed' });
    }

    // Record webhook event
    const eventDoc = await WebhookEvent.create({
      provider: 'telegram',
      event_id: updateId,
      payload_type: Object.keys(update).find((k) => k !== 'update_id') || 'unknown',
      raw_payload: update,
      processed: false,
    });

    // 1. Process chat_member update (Referral Attribution Engine)
    if (update.chat_member) {
      await ReferralService.processChatMemberUpdate(update.chat_member);
    }

    // 2. Process Telegram Stars Payments
    if (update.pre_checkout_query) {
      // Answer pre-checkout query to approve Telegram Stars purchase
      const pcq = update.pre_checkout_query;
      const bot = TelegramService.getBot();
      await bot.telegram.answerPreCheckoutQuery(pcq.id, true);
    }

    if (update.message?.successful_payment) {
      const sp = update.message.successful_payment;
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
      }
    }

    // Dispatch remaining standard updates to Telegraf
    try {
      const bot = TelegramService.getBot();
      await bot.handleUpdate(update);
    } catch (botErr: any) {
      logger.warn(`Telegraf handleUpdate warning: ${botErr.message}`);
    }

    eventDoc.processed = true;
    await eventDoc.save();

    res.status(200).json({ ok: true });
  } catch (err: any) {
    logger.error('Telegram webhook error:', { error: err.message });
    res.status(200).json({ ok: true, error: err.message }); // Always 200 to prevent Telegram retry spam
  }
});

// Custom Bot Webhook (For creators using their own BotFather token)
router.post('/telegram/custom/:botId/:secret', async (req, res) => {
  try {
    const { botId, secret } = req.params;
    const bot = await ConnectedBot.findOne({ bot_id: botId, webhook_secret: secret, is_active: true });
    if (!bot) {
      return res.status(403).json({ error: 'Custom bot not found or secret mismatch' });
    }

    const update = req.body;
    if (update.chat_member) {
      await ReferralService.processChatMemberUpdate(update.chat_member);
    }

    res.status(200).json({ ok: true });
  } catch (err: any) {
    logger.error('Custom bot webhook error:', { error: err.message });
    res.status(200).json({ ok: true });
  }
});

export const webhookRouter = router;
