import { Router } from 'express';
import { requireAuth, requireWorkspace } from '../auth/auth.middleware';
import { GiveawayService } from './giveaway.service';
import {
  GiveawayWinner,
  GiveawayEntry,
  Campaign,
  User,
} from '../../database/models';

const router = Router();

// Draw winners
router.post('/:campaignId/draw', requireAuth, requireWorkspace('admin'), async (req, res) => {
  try {
    const { winner_count, method, prize_details } = req.body;
    if (!prize_details) {
      return res.status(400).json({ error: 'prize_details is required' });
    }

    const result = await GiveawayService.drawWinners({
      campaignId: req.params.campaignId,
      winnerCount: Number(winner_count) || 1,
      method: method || 'random',
      prizeDetails: prize_details,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Replace winner
router.post('/replace-winner', requireAuth, requireWorkspace('admin'), async (req, res) => {
  try {
    const { winner_id, reason } = req.body;
    if (!winner_id || !reason) {
      return res.status(400).json({ error: 'winner_id and reason are required' });
    }

    const replacement = await GiveawayService.replaceWinner({
      winnerId: winner_id,
      reason,
    });

    res.json(replacement);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List campaign winners
router.get('/:campaignId/winners', requireAuth, requireWorkspace('viewer'), async (req, res) => {
  try {
    const winners = await GiveawayWinner.find({ campaign_id: req.params.campaignId }).sort({ rank: 1 });
    res.json(winners);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List participant entries
router.get('/:campaignId/entries', requireAuth, requireWorkspace('viewer'), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '25', 10);

    const [entries, total] = await Promise.all([
      GiveawayEntry.find({ campaign_id: req.params.campaignId })
        .sort({ entry_count: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      GiveawayEntry.countDocuments({ campaign_id: req.params.campaignId }),
    ]);

    res.json({
      data: entries,
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

// Public giveaway results page (Community provably fair view)
router.get('/public/:campaignId', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.campaignId).select('title description status type');
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const winners = await GiveawayWinner.find({
      campaign_id: campaign._id,
      status: { $in: ['selected', 'notified', 'claimed'] },
    }).sort({ rank: 1 });

    const maskedWinners = winners.map((w) => ({
      rank: w.rank,
      prize_details: w.prize_details,
      user_masked: `tg_***${w.user_telegram_id.slice(-4)}`,
      audit_hash: w.audit_hash,
      crypto_seed: w.crypto_seed,
      selected_method: w.selected_method,
      status: w.status,
    }));

    res.json({
      campaign,
      winners: maskedWinners,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export const giveawayRouter = router;
