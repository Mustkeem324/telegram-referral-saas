import mongoose from 'mongoose';
import { logger } from '../../utils/logger';
import { MysteryBox, IMysteryBox } from '../../database/models/MysteryBox';
import { Referral } from '../../database/models/Referral';
import { User } from '../../database/models/User';
import { Campaign } from '../../database/models/Campaign';

export class GamificationService {
  /**
   * Get user's gamification profile: mystery boxes, daily streak, next unlock progress
   */
  static async getUserProfile(userTelegramId: string) {
    const tgId = String(userTelegramId);

    const [user, verifiedCount, unopenedBoxes, openedBoxes] = await Promise.all([
      User.findOne({ telegram_id: tgId }),
      Referral.countDocuments({ referrer_telegram_id: tgId, status: { $in: ['verified', 'rewarded'] } }),
      MysteryBox.find({ user_telegram_id: tgId, status: 'unopened' }),
      MysteryBox.find({ user_telegram_id: tgId, status: 'opened' }).sort({ opened_at: -1 }).limit(5),
    ]);

    // Each 3 verified referrals awards a Mystery Box
    const earnedBoxesTotal = Math.floor(verifiedCount / 3);
    const existingBoxesCount = await MysteryBox.countDocuments({ user_telegram_id: tgId });

    // If user has earned more boxes than are created in DB, auto-mint them
    if (earnedBoxesTotal > existingBoxesCount && user) {
      const missingCount = earnedBoxesTotal - existingBoxesCount;
      const campaign = await Campaign.findOne({ status: 'active' });
      if (campaign) {
        for (let i = 0; i < missingCount; i++) {
          await this.mintMysteryBox(campaign.workspace_id, campaign._id, tgId, 'Earned from 3 verified referrals');
        }
      }
    }

    const currentUnopened = await MysteryBox.find({ user_telegram_id: tgId, status: 'unopened' });

    const progressToNext = verifiedCount % 3;
    const invitesNeeded = 3 - progressToNext;

    return {
      telegramId: tgId,
      verifiedInvites: verifiedCount,
      unopenedCount: currentUnopened.length,
      unopenedBoxes: currentUnopened,
      recentLoot: openedBoxes,
      progressToNextBox: {
        current: progressToNext,
        target: 3,
        percent: Math.round((progressToNext / 3) * 100),
        invitesNeeded,
      },
      streakDays: Math.min(14, Math.max(1, Math.floor(verifiedCount / 2) + 1)),
    };
  }

  /**
   * Mint a new mystery box for a user
   */
  static async mintMysteryBox(
    workspaceId: mongoose.Types.ObjectId,
    campaignId: mongoose.Types.ObjectId,
    userTelegramId: string,
    reason: string
  ): Promise<IMysteryBox> {
    const roll = Math.random();
    let tier: 'bronze' | 'silver' | 'gold' | 'cyber' = 'bronze';
    let rewardType: 'bonus_points' | 'stars' | 'vip_badge' | 'multiplier_boost' = 'bonus_points';
    let rewardValue = 25;
    let rewardTitle = '+25 Bonus Growth Points';

    if (roll > 0.9) {
      tier = 'cyber';
      rewardType = 'multiplier_boost';
      rewardValue = 3;
      rewardTitle = '⚡ 3x Cyber Point Multiplier Boost';
    } else if (roll > 0.7) {
      tier = 'gold';
      rewardType = 'bonus_points';
      rewardValue = 100;
      rewardTitle = '💎 +100 Ultra Points Jackpot';
    } else if (roll > 0.4) {
      tier = 'silver';
      rewardType = 'bonus_points';
      rewardValue = 50;
      rewardTitle = '✨ +50 Bonus Growth Points';
    }

    return await MysteryBox.create({
      workspace_id: workspaceId,
      campaign_id: campaignId,
      user_telegram_id: userTelegramId,
      box_tier: tier,
      status: 'unopened',
      reward_type: rewardType,
      reward_value: rewardValue,
      reward_title: rewardTitle,
      unlocked_reason: reason,
      unlocked_at: new Date(),
    });
  }

  /**
   * Open an unopened mystery box
   */
  static async openBox(userTelegramId: string, boxId?: string): Promise<{ success: boolean; box: IMysteryBox | null; message: string }> {
    const tgId = String(userTelegramId);

    const query: any = { user_telegram_id: tgId, status: 'unopened' };
    if (boxId) {
      query._id = boxId;
    }

    const box = await MysteryBox.findOne(query);
    if (!box) {
      return {
        success: false,
        box: null,
        message: 'No unopened Mystery Boxes available. Invite friends to unlock your next chest!',
      };
    }

    box.status = 'opened';
    box.opened_at = new Date();
    await box.save();

    logger.info(`User ${tgId} opened mystery box ${box._id} and won ${box.reward_title}`);

    return {
      success: true,
      box,
      message: `🎉 Unlocked ${box.reward_title} from your ${box.box_tier.toUpperCase()} Mystery Chest!`,
    };
  }
}
