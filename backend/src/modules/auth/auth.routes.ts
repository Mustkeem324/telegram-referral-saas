import { Router } from 'express';
import { AuthService } from './auth.service';
import { requireAuth } from './auth.middleware';
import { WorkspaceMember, Workspace, User } from '../../database/models';
import { config } from '../../config';

const router = Router();

router.post('/telegram-widget', async (req, res) => {
  try {
    const result = await AuthService.authenticateTelegramWidget(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/telegram-webapp', async (req, res) => {
  try {
    const { initData } = req.body;
    if (!initData) {
      return res.status(400).json({ error: 'initData is required' });
    }
    const result = await AuthService.authenticateTelegramWebApp(initData);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const memberships = await WorkspaceMember.find({ user_id: user._id, status: 'active' }).populate('workspace_id');
    const workspaces = memberships.map((m) => ({
      workspace: m.workspace_id,
      role: m.role,
    }));

    res.json({
      user,
      workspaces,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create bot auth session for deep linking
router.post('/bot-session', (req, res) => {
  const session = AuthService.createBotAuthSession();
  res.json(session);
});

// Check bot auth session status
router.get('/bot-session/:sessionId', (req, res) => {
  const session = AuthService.getBotAuthSession(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session expired or not found' });
  }
  res.json({
    authenticated: session.authenticated,
    token: session.token,
    workspaceId: session.workspaceId,
    user: session.user,
  });
});

export const authRouter = router;
