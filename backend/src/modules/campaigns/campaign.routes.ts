import { Router } from 'express';
import { requireAuth, requireWorkspace } from '../auth/auth.middleware';
import {
  Campaign,
  CampaignRequirement,
  TelegramChat,
  Reward,
  UsageCounter,
  Workspace,
} from '../../database/models';
import crypto from 'crypto';

const router = Router();

// List campaigns for current workspace
router.get('/', requireAuth, requireWorkspace('viewer'), async (req, res) => {
  try {
    const campaigns = await Campaign.find({ workspace_id: req.workspace!._id }).sort({ created_at: -1 });
    res.json(campaigns);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create new campaign
router.post('/', requireAuth, requireWorkspace('manager'), async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      start_date,
      end_date,
      reward_policy,
      fraud_rules,
      branding,
      required_chat_ids, // array of chat_ids
      rewards, // array of milestone rewards
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Campaign title is required.' });
    }

    // Check plan limits
    const ws = await Workspace.findById(req.workspace!._id).populate('plan_id');
    const plan: any = ws?.plan_id;
    const activeCampaignCount = await Campaign.countDocuments({
      workspace_id: ws!._id,
      status: 'active',
    });

    if (plan && activeCampaignCount >= plan.max_active_campaigns) {
      return res.status(403).json({
        error: `Your current plan (${plan.name}) allows up to ${plan.max_active_campaigns} active campaigns. Please upgrade.`,
      });
    }

    const slug = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString(36)}`;

    const campaign = await Campaign.create({
      workspace_id: req.workspace!._id,
      title,
      slug,
      description,
      type: type || 'referral',
      status: 'active',
      start_date: start_date ? new Date(start_date) : new Date(),
      end_date: end_date ? new Date(end_date) : undefined,
      reward_policy: reward_policy || {
        points_per_referral: 10,
        hold_period_hours: 0,
        retention_period_days: 0,
        allow_custom_rewards: true,
      },
      fraud_rules: fraud_rules || {
        max_referrals_per_ip_per_hour: 5,
        max_referrals_per_user_per_day: 50,
        require_verified_phone: false,
        auto_hold_suspicious: true,
        suspicious_threshold_score: 60,
      },
      branding: branding || {},
      created_by: req.user!._id,
    });

    // Save multi-channel requirements if provided
    if (Array.isArray(required_chat_ids) && required_chat_ids.length > 0) {
      for (let i = 0; i < required_chat_ids.length; i++) {
        await CampaignRequirement.create({
          workspace_id: req.workspace!._id,
          campaign_id: campaign._id,
          chat_id: String(required_chat_ids[i]),
          is_mandatory: true,
          order_index: i,
        });
      }
    }

    // Save milestone rewards if provided
    if (Array.isArray(rewards) && rewards.length > 0) {
      for (const r of rewards) {
        await Reward.create({
          workspace_id: req.workspace!._id,
          campaign_id: campaign._id,
          name: r.name,
          type: r.type || 'points',
          description: r.description,
          milestone_referrals_required: Number(r.milestone_referrals_required) || 1,
          points_value: Number(r.points_value) || 0,
          delivery_payload: r.delivery_payload,
          requires_inventory: Boolean(r.requires_inventory),
          is_active: true,
        });
      }
    }

    // Update usage counters
    const currentMonth = new Date().toISOString().slice(0, 7);
    await UsageCounter.findOneAndUpdate(
      { workspace_id: ws!._id, period_year_month: currentMonth },
      { $inc: { active_campaigns_count: 1 } },
      { upsert: true }
    );

    res.status(201).json(campaign);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get campaign by ID with requirements and rewards
router.get('/:campaignId', requireAuth, requireWorkspace('viewer'), async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.campaignId,
      workspace_id: req.workspace!._id,
    });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const requirements = await CampaignRequirement.find({ campaign_id: campaign._id }).sort({ order_index: 1 });
    const rewards = await Reward.find({ campaign_id: campaign._id }).sort({ milestone_referrals_required: 1 });

    res.json({
      campaign,
      requirements,
      rewards,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update campaign status (pause/resume/archive)
router.patch('/:campaignId/status', requireAuth, requireWorkspace('manager'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['draft', 'active', 'paused', 'ended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.campaignId, workspace_id: req.workspace!._id },
      { $set: { status } },
      { new: true }
    );
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    res.json(campaign);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export const campaignRouter = router;
