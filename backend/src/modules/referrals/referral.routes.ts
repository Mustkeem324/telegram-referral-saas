import { Router } from 'express';
import { requireAuth, requireWorkspace } from '../auth/auth.middleware';
import { ReferralService } from './referral.service';
import {
  Referral,
  ReferralCode,
  ReferralLink,
  Campaign,
  CampaignRequirement,
  ConnectedBot,
  User,
} from '../../database/models';
import { config } from '../../config';

const router = Router();

// Generate / retrieve personal invite link for a participant
router.post('/link', requireAuth, async (req, res) => {
  try {
    const { campaignId, chatId } = req.body;
    if (!campaignId) return res.status(400).json({ error: 'campaignId is required' });

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    // Target chat: if chatId provided use it, otherwise use first mandatory chat requirement
    let targetChatId = chatId;
    if (!targetChatId) {
      const requirement = await CampaignRequirement.findOne({ campaign_id: campaignId });
      if (!requirement) {
        return res.status(400).json({ error: 'No Telegram chat attached to this campaign.' });
      }
      targetChatId = requirement.chat_id;
    }

    const refCode = await ReferralService.getOrCreateReferralCode(
      campaign.workspace_id,
      campaign._id,
      req.user!.telegram_id
    );

    const inviteLink = await ReferralService.getOrCreateChatInviteLink({
      workspaceId: campaign.workspace_id,
      campaignId: campaign._id,
      userTelegramId: req.user!.telegram_id,
      chatId: targetChatId,
    });

    const customBot = await ConnectedBot.findOne({ workspace_id: campaign.workspace_id, is_active: true });
    const botUsername = (customBot && customBot.bot_username) ? customBot.bot_username : config.telegram.botUsername;

    res.json({
      referral_code: refCode,
      invite_link: inviteLink,
      bot_deep_link: `https://t.me/${botUsername}?start=ref_${refCode}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List referrals for campaign in dashboard
router.get('/campaign/:campaignId', requireAuth, requireWorkspace('viewer'), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const status = req.query.status as string;

    const filter: any = { campaign_id: req.params.campaignId };
    if (status && status !== 'all') {
      filter.status = status;
    }

    const [referrals, total] = await Promise.all([
      Referral.find(filter)
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Referral.countDocuments(filter),
    ]);

    res.json({
      data: referrals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Leaderboard for campaign
router.get('/leaderboard/:campaignId', async (req, res) => {
  try {
    const leaderboard = await ReferralCode.find({ campaign_id: req.params.campaignId })
      .sort({ verified_count: -1, joins_count: -1 })
      .limit(50);

    // Populate user info where available
    const enriched = await Promise.all(
      leaderboard.map(async (row) => {
        const user = await User.findOne({ telegram_id: row.user_telegram_id });
        return {
          user_telegram_id: row.user_telegram_id,
          username: user?.username || `User_${row.user_telegram_id.slice(-4)}`,
          first_name: user?.first_name || 'Anonymous',
          is_premium: Boolean(user?.is_premium),
          joins_count: row.joins_count,
          verified_count: row.verified_count,
          clicks_count: row.clicks_count,
        };
      })
    );

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export const referralRouter = router;
