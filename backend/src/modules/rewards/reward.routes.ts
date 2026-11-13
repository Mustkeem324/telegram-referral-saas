import { Router } from 'express';
import { requireAuth, requireWorkspace } from '../auth/auth.middleware';
import {
  Reward,
  RewardInventory,
  RewardTransaction,
  Campaign,
  User,
} from '../../database/models';
import crypto from 'crypto';

const router = Router();

// List rewards for campaign
router.get('/campaign/:campaignId', requireAuth, requireWorkspace('viewer'), async (req, res) => {
  try {
    const rewards = await Reward.find({
      campaign_id: req.params.campaignId,
      workspace_id: req.workspace!._id,
    }).sort({ milestone_referrals_required: 1 });

    res.json(rewards);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create reward configuration
router.post('/', requireAuth, requireWorkspace('manager'), async (req, res) => {
  try {
    const {
      campaign_id,
      name,
      type,
      description,
      milestone_referrals_required,
      points_value,
      delivery_payload,
      requires_inventory,
      auto_distribute,
    } = req.body;

    if (!name || !campaign_id) {
      return res.status(400).json({ error: 'Name and campaign_id are required.' });
    }

    const campaign = await Campaign.findOne({ _id: campaign_id, workspace_id: req.workspace!._id });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found in your workspace.' });
    }

    const reward = await Reward.create({
      workspace_id: req.workspace!._id,
      campaign_id,
      name,
      type: type || 'points',
      description,
      milestone_referrals_required: Number(milestone_referrals_required) || 1,
      points_value: Number(points_value) || 0,
      delivery_payload,
      requires_inventory: Boolean(requires_inventory),
      auto_distribute: auto_distribute !== undefined ? Boolean(auto_distribute) : true,
    });

    res.status(201).json(reward);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Upload batch inventory (digital keys / promo codes / links)
router.post('/:rewardId/inventory', requireAuth, requireWorkspace('manager'), async (req, res) => {
  try {
    const { codes } = req.body; // array of string keys or comma-separated
    if (!Array.isArray(codes) || codes.length === 0) {
      return res.status(400).json({ error: 'Array of codes/keys is required.' });
    }

    const reward = await Reward.findOne({ _id: req.params.rewardId, workspace_id: req.workspace!._id });
    if (!reward) return res.status(404).json({ error: 'Reward not found.' });

    const docs = codes.map((code) => ({
      workspace_id: req.workspace!._id,
      reward_id: reward._id,
      code_or_payload: String(code).trim(),
      is_claimed: false,
    }));

    await RewardInventory.insertMany(docs);
    reward.requires_inventory = true;
    reward.total_inventory += docs.length;
    await reward.save();

    res.json({
      success: true,
      added_count: docs.length,
      total_inventory: reward.total_inventory,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reward Transactions Ledger (Append-only)
router.get('/ledger/:campaignId', requireAuth, requireWorkspace('viewer'), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);

    const [transactions, total] = await Promise.all([
      RewardTransaction.find({ campaign_id: req.params.campaignId, workspace_id: req.workspace!._id })
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('reward_id'),
      RewardTransaction.countDocuments({ campaign_id: req.params.campaignId, workspace_id: req.workspace!._id }),
    ]);

    res.json({
      data: transactions,
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

// Manual Reward Credit (with ledger entry)
router.post('/manual-credit', requireAuth, requireWorkspace('admin'), async (req, res) => {
  try {
    const { campaign_id, user_telegram_id, amount, unit, reason, payload } = req.body;
    if (!campaign_id || !user_telegram_id || !amount) {
      return res.status(400).json({ error: 'campaign_id, user_telegram_id, and amount are required.' });
    }

    const txHash = crypto
      .createHash('sha256')
      .update(`manual_${campaign_id}_${user_telegram_id}_${amount}_${Date.now()}`)
      .digest('hex');

    const tx = await RewardTransaction.create({
      workspace_id: req.workspace!._id,
      campaign_id,
      user_telegram_id,
      type: 'credit',
      amount: Number(amount),
      unit: unit || 'points',
      transaction_hash: txHash,
      delivered_payload: payload,
      reason: reason || 'Manual credit by administrator',
    });

    res.status(201).json(tx);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export const rewardRouter = router;
