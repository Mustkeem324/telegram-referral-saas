import { Router } from 'express';
import { requireAuth, requireWorkspace } from '../auth/auth.middleware';
import { SubscriptionService } from './subscription.service';
import {
  SubscriptionPlan,
  Subscription,
  Invoice,
  UsageCounter,
  Workspace,
} from '../../database/models';
import crypto from 'crypto';

const router = Router();

// List all plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ is_active: true }).sort({ price_monthly_usd: 1 });
    res.json(plans);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get current workspace subscription & usage quota
router.get('/current', requireAuth, requireWorkspace('viewer'), async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ workspace_id: req.workspace!._id }).populate('plan_id');
    const currentMonth = new Date().toISOString().slice(0, 7);
    const usage = (await UsageCounter.findOne({
      workspace_id: req.workspace!._id,
      period_year_month: currentMonth,
    })) || {
      active_campaigns_count: 0,
      connected_chats_count: 0,
      verified_referrals_count: 0,
      api_requests_count: 0,
    };

    res.json({
      subscription,
      usage,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Process plan upgrade
router.post('/upgrade', requireAuth, requireWorkspace('owner'), async (req, res) => {
  try {
    const { plan_code, billing_cycle, provider, external_payment_id, telegram_charge_id } = req.body;
    if (!plan_code) {
      return res.status(400).json({ error: 'plan_code is required' });
    }

    const idempotencyKey =
      (req.headers['idempotency-key'] as string) ||
      crypto.randomBytes(16).toString('hex');

    const result = await SubscriptionService.processPaymentAndUpgrade({
      workspaceId: req.workspace!._id,
      userId: req.user!._id,
      planCode: plan_code,
      billingCycle: billing_cycle || 'monthly',
      provider: provider || 'telegram_stars',
      idempotencyKey,
      externalPaymentId: external_payment_id,
      telegramChargeId: telegram_charge_id,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List invoices
router.get('/invoices', requireAuth, requireWorkspace('viewer'), async (req, res) => {
  try {
    const invoices = await Invoice.find({ workspace_id: req.workspace!._id }).sort({ created_at: -1 });
    res.json(invoices);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel at period end
router.post('/cancel', requireAuth, requireWorkspace('owner'), async (req, res) => {
  try {
    const sub = await Subscription.findOneAndUpdate(
      { workspace_id: req.workspace!._id },
      { $set: { cancel_at_period_end: true } },
      { new: true }
    );
    res.json({ success: true, subscription: sub });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export const subscriptionRouter = router;
