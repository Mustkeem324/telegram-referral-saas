import { Router } from 'express';
import { requireAuth, requireWorkspace } from '../auth/auth.middleware';
import { AntiFraudService } from './antifraud.service';
import { FraudEvent } from '../../database/models';

const router = Router();

// List fraud events for current workspace
router.get('/', requireAuth, requireWorkspace('manager'), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const resolved = req.query.resolved === 'true';

    const filter: any = { workspace_id: req.workspace!._id };
    if (req.query.resolved !== undefined) {
      filter.resolved = resolved;
    }

    const [events, total] = await Promise.all([
      FraudEvent.find(filter)
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      FraudEvent.countDocuments(filter),
    ]);

    res.json({
      data: events,
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

// Resolve a fraud event
router.post('/:eventId/resolve', requireAuth, requireWorkspace('admin'), async (req, res) => {
  try {
    const { action } = req.body;
    if (!['dismissed', 'rejected_referral', 'held_rewards', 'banned_user'].includes(action)) {
      return res.status(400).json({ error: 'Invalid resolution action' });
    }

    await AntiFraudService.resolveFraudEvent({
      eventId: req.params.eventId,
      action,
      actorId: req.user!._id,
    });

    res.json({ success: true, message: `Event marked as ${action}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export const antifraudRouter = router;
