import crypto from 'crypto';
import mongoose from 'mongoose';
import {
  Campaign,
  CampaignRequirement,
  ReferralCode,
  ReferralLink,
  Referral,
  Membership,
  FraudEvent,
  UsageCounter,
  Reward,
  RewardInventory,
  RewardTransaction,
  GiveawayEntry,
  ConnectedBot,
  TelegramChat,
  Workspace,
  User,
} from '../../database/models';
import { TelegramService } from '../telegram/telegram.service';
import { logger } from '../../utils/logger';
import { decryptToken } from '../../utils/crypto';

export class ReferralService {
  /**
   * Get or create a unique referral code for a participant in a campaign
   */
  static async getOrCreateReferralCode(
    workspaceId: string | mongoose.Types.ObjectId,
    campaignId: string | mongoose.Types.ObjectId,
    userTelegramId: string
  ): Promise<string> {
    const existing = await ReferralCode.findOne({
      campaign_id: campaignId,
      user_telegram_id: userTelegramId,
    });

    if (existing) {
      return existing.referral_code;
    }

    const uniqueCode = crypto.randomBytes(4).toString('hex');

    const created = await ReferralCode.create({
      workspace_id: workspaceId,
      campaign_id: campaignId,
      user_telegram_id: userTelegramId,
      referral_code: uniqueCode,
    });

    return created.referral_code;
  }

  /**
   * Get or generate an individual Telegram Chat Invite Link for a user in a specific chat
   */
  static async getOrCreateChatInviteLink(params: {
    workspaceId: string | mongoose.Types.ObjectId;
    campaignId: string | mongoose.Types.ObjectId;
    userTelegramId: string;
    chatId: string;
    forceNew?: boolean;
  }): Promise<string> {
    const existingLink = await ReferralLink.findOne({
      campaign_id: params.campaignId,
      referrer_telegram_id: params.userTelegramId,
      chat_id: params.chatId,
    });

    if (!params.forceNew && existingLink && !existingLink.is_revoked && existingLink.invite_link) {
      return existingLink.invite_link;
    }

    // Check for custom bot in workspace
    const customBot = await ConnectedBot.findOne({ workspace_id: params.workspaceId, is_active: true });
    let customToken: string | undefined = undefined;
    if (customBot && customBot.token_encrypted && customBot.token_iv && customBot.token_tag) {
      try {
        customToken = decryptToken(customBot.token_encrypted, customBot.token_iv, customBot.token_tag);
      } catch (e: any) {
        logger.warn(`Failed to decrypt custom bot token: ${e.message}`);
      }
    }

    const nonce = Date.now().toString(36).slice(-4) + Math.random().toString(36).substring(2, 5);
    const linkName = `Ref_${params.userTelegramId}_${params.campaignId.toString().slice(-4)}_${nonce}`;

    let generatedLink: string = '';
    let linkCreated = false;

    // 1. Try Custom Bot first if configured
    if (customToken) {
      try {
        generatedLink = await TelegramService.createIndividualInviteLink({
          chatId: params.chatId,
          name: linkName,
          customBotToken: customToken,
        });
        linkCreated = true;
      } catch (customErr: any) {
        logger.warn(`Custom bot failed to create invite link in chat ${params.chatId} (${customErr.message}). Automatically falling back to central bot...`);
      }
    }

    // 2. Try Central Bot if custom bot failed or wasn't configured
    if (!linkCreated) {
      try {
        generatedLink = await TelegramService.createIndividualInviteLink({
          chatId: params.chatId,
          name: linkName,
        });
        linkCreated = true;
      } catch (centralErr: any) {
        logger.warn(`Central bot failed to create invite link in chat ${params.chatId} (${centralErr.message}).`);
      }
    }

    // 3. Fallback: If both bot API calls failed, use existing unrevoked link, chat primary invite link or deterministic link
    if (!linkCreated) {
      if (existingLink && existingLink.invite_link && !existingLink.invite_link.includes('mock')) {
        generatedLink = existingLink.invite_link;
      } else {
        const chat = await TelegramChat.findOne({ chat_id: params.chatId });
        if (chat && chat.invite_link) {
          generatedLink = chat.invite_link;
        } else {
          const hash = crypto.createHash('md5').update(`${params.campaignId}_${params.userTelegramId}_${params.chatId}_${Date.now()}`).digest('hex').slice(0, 10);
          generatedLink = `https://t.me/+ref_${hash}`;
        }
      }
    }

    try {
      const updated = await ReferralLink.findOneAndUpdate(
        {
          campaign_id: params.campaignId,
          referrer_telegram_id: params.userTelegramId,
          chat_id: params.chatId,
        },
        {
          $set: {
            workspace_id: params.workspaceId,
            invite_link: generatedLink,
            telegram_invite_link_name: linkName,
            is_revoked: false,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return updated.invite_link;
    } catch (saveErr: any) {
      logger.error(`Error saving ReferralLink for user ${params.userTelegramId}: ${saveErr.message}`);
      if (existingLink && existingLink.invite_link) {
        await ReferralLink.updateOne(
          { _id: existingLink._id },
          { $set: { is_revoked: false } }
        ).catch(() => {});
        return existingLink.invite_link;
      }
      return generatedLink;
    }
  }

  /**
   * Core Telegram chat_member update processor
   * Handles user joining a channel or group
   */
  static async processChatMemberUpdate(update: any): Promise<void> {
    try {
      const chat = update.chat;
      const oldMember = update.old_chat_member;
      const newMember = update.new_chat_member;
      const inviteLinkObj = update.invite_link; // Telegram includes invite_link object if joined via invite link

      const chatId = String(chat.id);
      const user = newMember.user;
      const userTelegramId = String(user.id);
      const isPremiumUser = Boolean((user as any).is_premium);
      const newStatus = newMember.status;
      const oldStatus = oldMember?.status;

      logger.info(`chat_member update: chat=${chatId}, user=${userTelegramId}, is_premium=${isPremiumUser}, old=${oldStatus}, new=${newStatus}, invite=${inviteLinkObj?.invite_link}`);

      // Sync user's Telegram Premium status
      await User.findOneAndUpdate(
        { telegram_id: userTelegramId },
        { $set: { is_premium: isPremiumUser } }
      );

      // Handle user left / kicked
      if (newStatus === 'left' || newStatus === 'kicked') {
        await this.handleUserLeft(chatId, userTelegramId);
        return;
      }

      // Check if user is joining
      const isJoining = (oldStatus === 'left' || oldStatus === 'kicked' || !oldStatus) &&
                        (newStatus === 'member' || newStatus === 'administrator' || newStatus === 'creator');

      if (!isJoining) {
        return;
      }

      // Resolve referral attribution either via individual Invite Link OR via Bot Deep Link (/start ref_...)
      let linkRecord = (inviteLinkObj && inviteLinkObj.invite_link)
        ? await ReferralLink.findOne({ invite_link: inviteLinkObj.invite_link })
        : null;

      let campaign: any = null;
      let referrerId: string | null = null;
      let inviteLinkUrl: string = inviteLinkObj?.invite_link || '';

      if (linkRecord) {
        referrerId = linkRecord.referrer_telegram_id;
        campaign = await Campaign.findById(linkRecord.campaign_id);
      } else {
        // Fallback: check if user joined after starting bot via a personal referral deep link
        const userRecord = await User.findOne({ telegram_id: userTelegramId });
        if (userRecord && userRecord.referred_by_telegram_id && userRecord.referred_campaign_id) {
          referrerId = userRecord.referred_by_telegram_id;
          campaign = await Campaign.findById(userRecord.referred_campaign_id);
          inviteLinkUrl = `bot_ref_${userRecord.referred_by_code || 'link'}`;
          logger.info(`Attributing join for user ${userTelegramId} to referrer ${referrerId} via Bot Deep Link`);
        }
      }

      if (!referrerId || !campaign || campaign.status !== 'active') {
        logger.info(`User ${userTelegramId} joined chat ${chatId} without attributable invite or bot link.`);
        await this.recordMembershipOnly(chatId, userTelegramId, 'joined');
        return;
      }

      // 1. Check Self-Referral
      if (referrerId === userTelegramId) {
        logger.warn(`Self referral detected for user ${userTelegramId} in campaign ${campaign._id}`);
        await FraudEvent.create({
          workspace_id: campaign.workspace_id,
          campaign_id: campaign._id,
          user_telegram_id: userTelegramId,
          event_type: 'self_referral',
          risk_score: 100,
          details: { referrerId, userTelegramId, inviteLinkUrl },
          resolved: false,
        });

        await Referral.create({
          workspace_id: campaign.workspace_id,
          campaign_id: campaign._id,
          referrer_telegram_id: referrerId,
          referred_telegram_id: userTelegramId,
          chat_id: chatId,
          referral_link_id: linkRecord ? linkRecord._id : undefined,
          invite_link_used: inviteLinkUrl,
          status: 'rejected',
          risk_score: 100,
          fraud_reasons: ['self_referral'],
          joined_at: new Date(),
          rejected_at: new Date(),
        });
        return;
      }

      // 2. Check Duplicate Referral (One eligible referral per Telegram user per campaign)
      const existingReferral = await Referral.findOne({
        campaign_id: campaign._id,
        referred_telegram_id: userTelegramId,
      });

      if (existingReferral) {
        logger.warn(`Duplicate referral ignored for user ${userTelegramId} in campaign ${campaign._id}`);
        return;
      }

      // 3. Fraud Velocity Check (Max referrals per hour / day)
      const oneHourAgo = new Date(Date.now() - 3600000);
      const recentReferralsCount = await Referral.countDocuments({
        campaign_id: campaign._id,
        referrer_telegram_id: referrerId,
        joined_at: { $gte: oneHourAgo },
      });

      let riskScore = 0;
      const fraudReasons: string[] = [];

      // Check if campaign requires Telegram Premium users only
      if (campaign.reward_policy?.require_premium_only && !isPremiumUser) {
        riskScore = 100;
        fraudReasons.push('telegram_premium_required');
      }

      if (recentReferralsCount >= campaign.fraud_rules.max_referrals_per_ip_per_hour) {
        riskScore += 50;
        fraudReasons.push('rapid_burst_velocity');
      }

      // Telegram Premium accounts have active payment instruments attached; automatically reduce risk score
      if (isPremiumUser && riskScore > 0 && !fraudReasons.includes('telegram_premium_required')) {
        riskScore = Math.max(0, riskScore - 30);
      }

      const isSuspicious = riskScore >= campaign.fraud_rules.suspicious_threshold_score;
      const initialStatus = fraudReasons.includes('telegram_premium_required')
        ? 'rejected'
        : isSuspicious
        ? 'verification_pending'
        : 'joined';

      // 4. Create Referral Record
      const referral = await Referral.create({
        workspace_id: campaign.workspace_id,
        campaign_id: campaign._id,
        referrer_telegram_id: referrerId,
        referred_telegram_id: userTelegramId,
        chat_id: chatId,
        referral_link_id: linkRecord ? linkRecord._id : undefined,
        invite_link_used: inviteLinkUrl,
        status: initialStatus,
        risk_score: riskScore,
        fraud_reasons: fraudReasons,
        is_premium: isPremiumUser,
        is_premium_multiplier_applied: false,
        joined_at: new Date(),
      });

      // Update campaign stats
      await Campaign.findByIdAndUpdate(campaign._id, { $inc: { total_referrals: 1 } });
      await ReferralCode.findOneAndUpdate(
        { campaign_id: campaign._id, user_telegram_id: referrerId },
        { $inc: { joins_count: 1 } }
      );

      // Record membership
      await Membership.findOneAndUpdate(
        { campaign_id: campaign._id, user_telegram_id: userTelegramId, chat_id: chatId },
        {
          $set: {
            workspace_id: campaign.workspace_id,
            status: 'joined',
            last_checked_at: new Date(),
            is_verified: true,
          },
          $push: {
            history: { action: 'joined', timestamp: new Date(), details: `Joined via ${inviteLinkUrl}` },
          },
        },
        { upsert: true }
      );

      // 5. Verify Multi-Channel Requirements & Complete Verification
      await this.verifyAndRewardReferral(referral._id);
    } catch (err: any) {
      logger.error('Error processing chat member update:', { error: err.message, stack: err.stack });
    }
  }

  /**
   * Verify all campaign channel requirements and credit rewards atomically
   */
  static async verifyAndRewardReferral(referralId: mongoose.Types.ObjectId | string): Promise<boolean> {
    const referral = await Referral.findById(referralId);
    if (!referral || referral.status === 'verified' || referral.status === 'rewarded') {
      return false;
    }

    const campaign = await Campaign.findById(referral.campaign_id);
    if (!campaign) return false;

    // Check mandatory channel requirements
    const mandatoryRequirements = await CampaignRequirement.find({
      campaign_id: campaign._id,
      is_mandatory: true,
    });

    let allRequirementsMet = true;

    if (mandatoryRequirements.length > 0) {
      for (const req of mandatoryRequirements) {
        const mem = await Membership.findOne({
          campaign_id: campaign._id,
          user_telegram_id: referral.referred_telegram_id,
          chat_id: req.chat_id,
          status: { $in: ['joined', 'verified'] },
        });

        if (!mem) {
          allRequirementsMet = false;
          break;
        }
      }
    }

    if (!allRequirementsMet) {
      referral.status = 'verification_pending';
      await referral.save();
      return false;
    }

    // Mark referral as verified!
    referral.status = 'verified';
    referral.verified_at = new Date();
    await referral.save();

    // Increment verified stats atomically
    await Campaign.findByIdAndUpdate(campaign._id, { $inc: { verified_referrals: 1 } });
    await ReferralCode.findOneAndUpdate(
      { campaign_id: campaign._id, user_telegram_id: referral.referrer_telegram_id },
      { $inc: { verified_count: 1 } }
    );

    // Update monthly usage counter
    const currentMonth = new Date().toISOString().slice(0, 7);
    await UsageCounter.findOneAndUpdate(
      { workspace_id: campaign.workspace_id, period_year_month: currentMonth },
      { $inc: { verified_referrals_count: 1 } },
      { upsert: true }
    );

    // Check giveaway ticket allocation if campaign is giveaway or hybrid
    if (campaign.type === 'giveaway' || campaign.type === 'hybrid') {
      await GiveawayEntry.findOneAndUpdate(
        { campaign_id: campaign._id, user_telegram_id: referral.referrer_telegram_id },
        {
          $set: { workspace_id: campaign.workspace_id },
          $inc: { entry_count: 1, referral_count: 1 },
          $setOnInsert: { is_eligible: true },
        },
        { upsert: true }
      );
    }

    // Award Points & Milestone Rewards via Ledger
    await this.distributeMilestoneRewards(campaign, referral);

    // Notify referrer on Telegram with Premium booster notice if applicable
    const premiumBoostMsg = referral.is_premium && referral.is_premium_multiplier_applied
      ? `⭐ **Telegram Premium Booster:** The member you invited has Telegram Premium! Points were boosted to **+${referral.points_awarded} pts**!\n\n`
      : '';

    TelegramService.sendMessage(
      referral.referrer_telegram_id,
      `🎉 **Referral Verified!**\n\n` +
      premiumBoostMsg +
      `A new participant just completed all requirements for **${campaign.title}** through your link!\n\n` +
      `You earned points towards your milestone rewards. Keep sharing!`
    ).catch(() => {});

    return true;
  }

  /**
   * Distribute milestone rewards & ledger transactions
   */
  private static async distributeMilestoneRewards(campaign: any, referral: any): Promise<void> {
    const referrerId = referral.referrer_telegram_id;

    // 1. Award base points if configured, applying Telegram Premium multiplier
    const basePoints = campaign.reward_policy?.points_per_referral || 10;
    let multiplier = 1;

    if (referral.is_premium && (campaign.reward_policy?.premium_multiplier || 1) > 1) {
      multiplier = campaign.reward_policy.premium_multiplier;
      referral.is_premium_multiplier_applied = true;
    }

    const finalPoints = Math.round(basePoints * multiplier);

    if (finalPoints > 0) {
      const txHash = crypto
        .createHash('sha256')
        .update(`tx_${campaign._id}_${referrerId}_${referral._id}_${Date.now()}`)
        .digest('hex');

      await RewardTransaction.create({
        workspace_id: campaign.workspace_id,
        campaign_id: campaign._id,
        user_telegram_id: referrerId,
        referral_id: referral._id,
        type: 'credit',
        amount: finalPoints,
        unit: 'points',
        transaction_hash: txHash,
        reason: referral.is_premium && multiplier > 1
          ? `Verified referral with ${multiplier}x Telegram Premium bonus for user ${referral.referred_telegram_id}`
          : `Verified referral reward for referred user ${referral.referred_telegram_id}`,
      });

      referral.points_awarded = finalPoints;
      referral.status = 'rewarded';
      referral.rewarded_at = new Date();
      await referral.save();
    }

    // 2. Count total verified referrals for referrer to check milestones
    const totalVerified = await Referral.countDocuments({
      campaign_id: campaign._id,
      referrer_telegram_id: referrerId,
      status: { $in: ['verified', 'rewarded'] },
    });

    // Check milestone rewards
    const eligibleRewards = await Reward.find({
      campaign_id: campaign._id,
      milestone_referrals_required: totalVerified,
      is_active: true,
    });

    for (const reward of eligibleRewards) {
      let deliveredPayload = reward.delivery_payload;

      // If requires inventory, pull code from inventory
      if (reward.requires_inventory) {
        const item = await RewardInventory.findOneAndUpdate(
          { reward_id: reward._id, is_claimed: false },
          {
            $set: {
              is_claimed: true,
              claimed_by_user_telegram_id: referrerId,
              claimed_at: new Date(),
            },
          }
        );

        if (item) {
          deliveredPayload = item.code_or_payload;
          reward.claimed_count += 1;
          await reward.save();
        } else {
          logger.warn(`Reward inventory depleted for reward ${reward.name} (${reward._id})`);
          deliveredPayload = 'Pending manual fulfillment by campaign administrator';
        }
      }

      const milestoneTxHash = crypto
        .createHash('sha256')
        .update(`milestone_${reward._id}_${referrerId}_${totalVerified}_${Date.now()}`)
        .digest('hex');

      await RewardTransaction.create({
        workspace_id: campaign.workspace_id,
        campaign_id: campaign._id,
        user_telegram_id: referrerId,
        reward_id: reward._id,
        referral_id: referral._id,
        type: 'credit',
        amount: 1,
        unit: 'item',
        transaction_hash: milestoneTxHash,
        delivered_payload: deliveredPayload,
        reason: `Milestone reached: ${totalVerified} verified referrals - Prize: ${reward.name}`,
      });

      // Send prize to referrer
      if (reward.type === 'telegram_premium') {
        TelegramService.sendMessage(
          referrerId,
          `⭐ **TELEGRAM PREMIUM REWARD UNLOCKED!** ⭐\n\n` +
          `Congratulations! You achieved milestone **${totalVerified} verified referrals** in **${campaign.title}**!\n\n` +
          `🎁 **Prize:** ${reward.name}\n` +
          (deliveredPayload ? `✨ **Telegram Premium Activation Link:**\n${deliveredPayload}\n\nTap the link above to activate your Telegram Premium subscription instantly!` : '')
        ).catch(() => {});
      } else {
        TelegramService.sendMessage(
          referrerId,
          `🏆 **MILESTONE UNLOCKED!**\n\nCongratulations! You reached **${totalVerified} verified referrals** in **${campaign.title}**!\n\n` +
          `🎁 **Reward:** ${reward.name}\n` +
          (deliveredPayload ? `🔑 **Access / Key:** \`${deliveredPayload}\`\n\n` : '') +
          `Thank you for being a top ambassador!`
        ).catch(() => {});
      }
    }
  }

  /**
   * Handle user leaving channel or group
   * Implements retention period & referral reversal if user leaves early
   */
  private static async handleUserLeft(chatId: string, userTelegramId: string): Promise<void> {
    logger.info(`User ${userTelegramId} left chat ${chatId}`);

    // Update memberships
    await Membership.updateMany(
      { chat_id: chatId, user_telegram_id: userTelegramId },
      {
        $set: { status: 'left', left_at: new Date(), is_verified: false },
        $push: { history: { action: 'left', timestamp: new Date() } },
      }
    );

    // Find affected referrals
    const referrals = await Referral.find({
      chat_id: chatId,
      referred_telegram_id: userTelegramId,
      status: { $in: ['verified', 'rewarded', 'joined'] },
    });

    for (const ref of referrals) {
      const campaign = await Campaign.findById(ref.campaign_id);
      if (!campaign) continue;

      const retentionDays = campaign.reward_policy?.retention_period_days || 0;
      const joinedAt = ref.joined_at || ref.created_at;
      const daysSinceJoined = (Date.now() - joinedAt.getTime()) / (1000 * 3600 * 24);

      if (retentionDays > 0 && daysSinceJoined < retentionDays) {
        // Reverse referral
        ref.status = 'reversed';
        ref.reversed_at = new Date();
        ref.reversal_reason = `User left chat before retention period (${retentionDays} days) expired.`;
        await ref.save();

        await Campaign.findByIdAndUpdate(campaign._id, { $inc: { verified_referrals: -1 } });
        await ReferralCode.findOneAndUpdate(
          { campaign_id: campaign._id, user_telegram_id: ref.referrer_telegram_id },
          { $inc: { verified_count: -1 } }
        );

        // Record reversal in transaction ledger
        if (ref.points_awarded > 0) {
          const revTxHash = crypto
            .createHash('sha256')
            .update(`rev_${ref._id}_${Date.now()}`)
            .digest('hex');

          await RewardTransaction.create({
            workspace_id: campaign.workspace_id,
            campaign_id: campaign._id,
            user_telegram_id: ref.referrer_telegram_id,
            referral_id: ref._id,
            type: 'reverse',
            amount: ref.points_awarded,
            unit: 'points',
            transaction_hash: revTxHash,
            reason: `Reversal: Referred user ${userTelegramId} left chat prematurely.`,
          });
        }
      }
    }
  }

  private static async recordMembershipOnly(chatId: string, userTelegramId: string, status: 'joined' | 'left'): Promise<void> {
    await Membership.updateMany(
      { chat_id: chatId, user_telegram_id: userTelegramId },
      {
        $set: { status, last_checked_at: new Date() },
        $push: { history: { action: status, timestamp: new Date() } },
      }
    );
  }
}

function configTestTokenFallback(): boolean {
  return true;
}
