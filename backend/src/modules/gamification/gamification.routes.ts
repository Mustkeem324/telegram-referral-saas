import { Router, Request, Response } from 'express';
import { requireAuth } from '../auth/auth.middleware';
import { GamificationService } from './gamification.service';

const router = Router();

// Get current user's gamification profile
router.get('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const profile = await GamificationService.getUserProfile(req.user!.telegram_id);
    res.json({ success: true, profile });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Open an unopened Mystery Box
router.post('/open-box', requireAuth, async (req: Request, res: Response) => {
  try {
    const { boxId } = req.body;
    const result = await GamificationService.openBox(req.user!.telegram_id, boxId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Public profile endpoint for Mini-App authentication by Telegram ID
router.get('/public-profile/:telegramId', async (req: Request, res: Response) => {
  try {
    const profile = await GamificationService.getUserProfile(req.params.telegramId);
    res.json({ success: true, profile });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Public open-box endpoint for Mini-App
router.post('/public-open-box', async (req: Request, res: Response) => {
  try {
    const { telegramId, boxId } = req.body;
    if (!telegramId) {
      return res.status(400).json({ error: 'telegramId is required' });
    }
    const result = await GamificationService.openBox(telegramId, boxId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export const gamificationRouter = router;
