import mongoose from 'mongoose';
import crypto from 'crypto';
import {
  SubscriptionPlan,
  Subscription,
  Payment,
  Invoice,
  Workspace,
  UsageCounter,
} from '../../database/models';
import { logger } from '../../utils/logger';

export class SubscriptionService {
  /**
   * Check if workspace has reached a specific resource quota
   */
  static async checkQuota(
    workspaceId: string | mongoose.Types.ObjectId,
    resource: 'campaigns' | 'chats' | 'referrals'
  ): Promise<{ allowed: boolean; current: number; max: number; planName: string }> {
    const ws = await Workspace.findById(workspaceId).populate('plan_id');
    if (!ws) throw new Error('Workspace not found');

    const plan: any = ws.plan_id;
    if (!plan) throw new Error('Plan not attached to workspace');

    const currentMonth = new Date().toISOString().slice(0, 7);
    const usage = await UsageCounter.findOne({
      workspace_id: ws._id,
      period_year_month: currentMonth,
    });

    if (resource === 'campaigns') {
      const activeCampaigns = usage?.active_campaigns_count || 0;
      return {
        allowed: activeCampaigns < plan.max_active_campaigns,
        current: activeCampaigns,
        max: plan.max_active_campaigns,
        planName: plan.name,
      };
    }

    if (resource === 'chats') {
      const connectedChats = usage?.connected_chats_count || 0;
      return {
        allowed: connectedChats < plan.max_connected_chats,
        current: connectedChats,
        max: plan.max_connected_chats,
        planName: plan.name,
      };
    }

    if (resource === 'referrals') {
      const verifiedRefs = usage?.verified_referrals_count || 0;
      return {
        allowed: verifiedRefs < plan.max_verified_referrals_monthly,
        current: verifiedRefs,
        max: plan.max_verified_referrals_monthly,
        planName: plan.name,
      };
    }

    return { allowed: true, current: 0, max: 999999, planName: plan.name };
  }

  /**
   * Process and activate subscription with idempotency protection
   */
  static async processPaymentAndUpgrade(params: {
    workspaceId: string | mongoose.Types.ObjectId;
    userId: string | mongoose.Types.ObjectId;
    planCode: 'free' | 'pro' | 'business' | 'enterprise';
    billingCycle: 'monthly' | 'yearly';
    provider: 'telegram_stars' | 'stripe' | 'manual';
    idempotencyKey: string;
    externalPaymentId?: string;
    telegramChargeId?: string;
  }): Promise<{ subscription: any; payment: any; invoice: any }> {
    const plan = await SubscriptionPlan.findOne({ code: params.planCode });
    if (!plan) throw new Error(`Plan code ${params.planCode} not found`);

    // Check idempotency
    const existingPayment = await Payment.findOne({ idempotency_key: params.idempotencyKey });
    if (existingPayment) {
      const existingSub = await Subscription.findOne({ workspace_id: params.workspaceId });
      const existingInv = await Invoice.findOne({ payment_id: existingPayment._id });
      return { subscription: existingSub, payment: existingPayment, invoice: existingInv };
    }

    const isYearly = params.billingCycle === 'yearly';
    let amount = 0;
    let currency = 'USD';

    if (params.provider === 'telegram_stars') {
      currency = 'XTR';
      amount = isYearly ? plan.telegram_stars_yearly : plan.telegram_stars_monthly;
    } else {
      currency = 'USD';
      amount = isYearly ? plan.price_yearly_usd : plan.price_monthly_usd;
    }

    const payloadHash = crypto
      .createHash('sha256')
      .update(`${params.workspaceId}:${params.planCode}:${amount}:${params.idempotencyKey}`)
      .digest('hex');

    // Create payment record
    const payment = await Payment.create({
      workspace_id: params.workspaceId,
      user_id: params.userId,
      provider: params.provider,
      plan_id: plan._id,
      amount,
      currency,
      external_payment_id: params.externalPaymentId,
      telegram_payment_charge_id: params.telegramChargeId,
      status: 'succeeded',
      idempotency_key: params.idempotencyKey,
      payload_hash: payloadHash,
    });

    // Update workspace plan
    await Workspace.findByIdAndUpdate(params.workspaceId, {
      $set: { plan_id: plan._id },
    });

    // Compute period dates
    const startDate = new Date();
    const endDate = new Date(startDate);
    if (isYearly) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Upsert subscription
    const subscription = await Subscription.findOneAndUpdate(
      { workspace_id: params.workspaceId },
      {
        $set: {
          plan_id: plan._id,
          billing_cycle: params.billingCycle,
          status: 'active',
          current_period_start: startDate,
          current_period_end: endDate,
          cancel_at_period_end: false,
          payment_provider: params.provider,
          last_payment_id: payment._id,
        },
      },
      { upsert: true, new: true }
    );

    // Generate invoice
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const invoice = await Invoice.create({
      workspace_id: params.workspaceId,
      subscription_id: subscription._id,
      payment_id: payment._id,
      invoice_number: invoiceNumber,
      amount,
      currency,
      status: 'paid',
      period_start: startDate,
      period_end: endDate,
    });

    logger.info(`Workspace ${params.workspaceId} upgraded to ${plan.name} (${params.billingCycle}) via ${params.provider}`);

    return { subscription, payment, invoice };
  }
}
