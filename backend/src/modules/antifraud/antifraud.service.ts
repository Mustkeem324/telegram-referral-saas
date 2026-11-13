import mongoose from 'mongoose';
import {
  FraudEvent,
  Referral,
  Campaign,
  User,
  RewardTransaction,
  AuditLog,
} from '../../database/models';
import crypto from 'crypto';
import { logger } from '../../utils/logger';

export class AntiFraudService {
  /**
   * Evaluate risk score for a referral attempt
   */
  static async evaluateReferralRisk(params: {
    campaignId: string | mongoose.Types.ObjectId;
    referrerTelegramId: string;
    referredTelegramId: string;
  }): Promise<{ riskScore: number; reasons: string[]; autoHold: boolean }> {
    const campaign = await Campaign.findById(params.campaignId);
    if (!campaign) {
      return { riskScore: 100, reasons: ['invalid_campaign'], autoHold: true };
    }

    let riskScore = 0;
    const reasons: string[] = [];

    // 1. Self Referral Check
    if (params.referrerTelegramId === params.referredTelegramId) {
      riskScore = 100;
      reasons.push('self_referral');
      return { riskScore, reasons, autoHold: true };
    }

    // 2. Velocity Check (joins in the last 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentJoins = await Referral.countDocuments({
      campaign_id: campaign._id,
      referrer_telegram_id: params.referrerTelegramId,
      joined_at: { $gte: fifteenMinutesAgo },
    });

    const hourlyThreshold = campaign.fraud_rules.max_referrals_per_ip_per_hour || 5;
    if (recentJoins >= hourlyThreshold) {
      riskScore += 45;
      reasons.push('velocity_burst_15m');
    }

    // 3. Daily Limit Check
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyJoins = await Referral.countDocuments({
      campaign_id: campaign._id,
      referrer_telegram_id: params.referrerTelegramId,
      joined_at: { $gte: today },
    });

    const dailyThreshold = campaign.fraud_rules.max_referrals_per_user_per_day || 50;
    if (dailyJoins >= dailyThreshold) {
      riskScore += 35;
      reasons.push('daily_cap_exceeded');
    }

    // 4. Repeated Fraud History Check
    const pastFraudCount = await FraudEvent.countDocuments({
      user_telegram_id: params.referrerTelegramId,
      resolved: false,
    });

    if (pastFraudCount > 0) {
      riskScore += 30;
      reasons.push('past_fraud_history');
    }

    const autoHold = riskScore >= campaign.fraud_rules.suspicious_threshold_score;

    if (riskScore > 0) {
      await FraudEvent.create({
        workspace_id: campaign.workspace_id,
        campaign_id: campaign._id,
        user_telegram_id: params.referrerTelegramId,
        event_type: reasons[0] as any || 'token_farming',
        risk_score: riskScore,
        details: {
          referrer: params.referrerTelegramId,
          referred: params.referredTelegramId,
          reasons,
          recentJoins,
          dailyJoins,
        },
        resolved: false,
      });
    }

    return { riskScore, reasons, autoHold };
  }

  /**
   * Resolve a fraud event (Dismiss, Reject Referral, Hold, Ban User)
   */
  static async resolveFraudEvent(params: {
    eventId: string;
    action: 'dismissed' | 'rejected_referral' | 'held_rewards' | 'banned_user';
    actorId: mongoose.Types.ObjectId;
  }): Promise<boolean> {
    const event = await FraudEvent.findById(params.eventId);
    if (!event) throw new Error('Fraud event not found');

    event.resolved = true;
    event.resolution_action = params.action;
    event.resolved_by = params.actorId;
    event.resolved_at = new Date();
    await event.save();

    // If banned user, deactivate user record
    if (params.action === 'banned_user') {
      await User.findOneAndUpdate(
        { telegram_id: event.user_telegram_id },
        {
          $set: {
            is_active: false,
            banned_at: new Date(),
            ban_reason: `Fraud mitigation: ${event.event_type}`,
          },
        }
      );
    }

    // If rejected referral, reject active referrals and reverse points
    if (params.action === 'rejected_referral' && event.campaign_id) {
      const suspiciousReferrals = await Referral.find({
        campaign_id: event.campaign_id,
        referrer_telegram_id: event.user_telegram_id,
        status: { $in: ['joined', 'verification_pending', 'verified'] },
      });

      for (const ref of suspiciousReferrals) {
        ref.status = 'rejected';
        ref.rejected_at = new Date();
        await ref.save();

        if (ref.points_awarded > 0) {
          const revHash = crypto.createHash('sha256').update(`fraud_rev_${ref._id}`).digest('hex');
          await RewardTransaction.create({
            workspace_id: event.workspace_id,
            campaign_id: event.campaign_id,
            user_telegram_id: event.user_telegram_id,
            referral_id: ref._id,
            type: 'reverse',
            amount: ref.points_awarded,
            unit: 'points',
            transaction_hash: revHash,
            reason: `Reversed due to fraud event resolution: ${event.event_type}`,
          });
        }
      }
    }

    return true;
  }
}
