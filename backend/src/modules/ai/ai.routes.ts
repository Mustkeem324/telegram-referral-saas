import { Router, Request, Response } from 'express';
import { requireAuth, requireWorkspace } from '../auth/auth.middleware';
import { AIService } from './ai.service';

const router = Router();

// AI Copilot Chat query
router.post('/copilot/chat', requireAuth, requireWorkspace('viewer'), async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message prompt is required' });
    }

    const response = await AIService.handleCopilotQuery(req.workspace!._id.toString(), message);
    res.json({ reply: response, timestamp: new Date() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AI Campaign Architect Generator
router.post('/copilot/campaign-generator', requireAuth, requireWorkspace('viewer'), async (req: Request, res: Response) => {
  try {
    const { niche, goal, targetAudience, hasPremiumBudget } = req.body;
    const plan = await AIService.generateCampaignPlan({ niche, goal, targetAudience, hasPremiumBudget });
    res.json({ success: true, plan });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AI Viral Copywriter
router.post('/copilot/generate-copy', requireAuth, requireWorkspace('viewer'), async (req: Request, res: Response) => {
  try {
    const { campaignTitle, style, customInstructions } = req.body;
    const copy = await AIService.generateViralCopy({ campaignTitle, style: style || 'hyper-hype', customInstructions });
    res.json({ success: true, copy });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AI Anomaly Radar Insights
router.get('/copilot/insights', requireAuth, requireWorkspace('viewer'), async (req: Request, res: Response) => {
  try {
    const insights = await AIService.analyzeGrowthAnomalies(req.workspace!._id.toString());
    res.json({ success: true, insights });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export const aiRouter = router;
