import mongoose from 'mongoose';
import {
  Membership,
  CampaignRequirement,
  Campaign,
  Referral,
  ConnectedBot,
} from '../../database/models';
import { TelegramService } from '../telegram/telegram.service';
import { decryptToken } from '../../utils/crypto';
import { logger } from '../../utils/logger';

export class VerificationService {
  /**
   * Verify an individual user's membership across all required channels/groups in a campaign
   */
  static async verifyUserRequirements(params: {
    campaignId: string | mongoose.Types.ObjectId;
    userTelegramId: string;
  }): Promise<{ allVerified: boolean; details: Array<{ chatId: string; isMember: boolean; status: string }> }> {
    const campaign = await Campaign.findById(params.campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const requirements = await CampaignRequirement.find({
      campaign_id: campaign._id,
      is_mandatory: true,
    });

    if (requirements.length === 0) {
      return { allVerified: true, details: [] };
    }

    // Check custom bot
    const customBot = await ConnectedBot.findOne({ workspace_id: campaign.workspace_id, is_active: true });
    let customToken: string | undefined = undefined;
    if (customBot && customBot.token_encrypted && customBot.token_iv && customBot.token_tag) {
      customToken = decryptToken(customBot.token_encrypted, customBot.token_iv, customBot.token_tag);
    }

    const details: Array<{ chatId: string; isMember: boolean; status: string }> = [];
    let allVerified = true;

    for (const req of requirements) {
      try {
        const check = await TelegramService.checkUserMembership(req.chat_id, params.userTelegramId, customToken);
        details.push({ chatId: req.chat_id, isMember: check.isMember, status: check.status });

        // Update membership record
        await Membership.findOneAndUpdate(
          { campaign_id: campaign._id, user_telegram_id: params.userTelegramId, chat_id: req.chat_id },
          {
            $set: {
              workspace_id: campaign.workspace_id,
              status: check.isMember ? 'verified' : (check.status as any) || 'unknown',
              is_verified: check.isMember,
              last_checked_at: new Date(),
            },
            $push: {
              history: {
                action: check.isMember ? 'verified' : 'left',
                timestamp: new Date(),
                details: `Status check: ${check.status}`,
              },
            },
          },
          { upsert: true }
        );

        if (!check.isMember) {
          allVerified = false;
        }
      } catch (err: any) {
        logger.error(`Verification error for chat ${req.chat_id}: ${err.message}`);
        details.push({ chatId: req.chat_id, isMember: false, status: 'error' });
        allVerified = false;
      }
    }

    return { allVerified, details };
  }

  /**
   * Batch verification job to re-verify retention for active referrals
   */
  static async runRetentionVerificationAudit(campaignId: string): Promise<{ checkedCount: number; reversedCount: number }> {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return { checkedCount: 0, reversedCount: 0 };

    const retentionDays = campaign.reward_policy?.retention_period_days || 0;
    if (retentionDays <= 0) return { checkedCount: 0, reversedCount: 0 };

    const activeReferrals = await Referral.find({
      campaign_id: campaignId,
      status: { $in: ['verified', 'rewarded'] },
    });

    let checkedCount = 0;
    let reversedCount = 0;

    for (const ref of activeReferrals) {
      checkedCount++;
      const res = await this.verifyUserRequirements({
        campaignId,
        userTelegramId: ref.referred_telegram_id,
      });

      if (!res.allVerified) {
        ref.status = 'reversed';
        ref.reversed_at = new Date();
        ref.reversal_reason = 'Failed scheduled membership retention audit';
        await ref.save();
        reversedCount++;
      }
    }

    return { checkedCount, reversedCount };
  }
}
