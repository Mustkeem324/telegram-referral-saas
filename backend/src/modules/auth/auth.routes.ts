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

// Testing / local development login endpoint
router.post('/dev-login', async (req, res) => {
  try {
    const { telegramId, firstName, username, role } = req.body;
    const tgId = telegramId || '987654321';

    let user = await User.findOne({ telegram_id: tgId });
    if (!user) {
      user = await User.create({
        telegram_id: tgId,
        first_name: firstName || 'Test Creator',
        username: username || 'test_creator',
        role: role === 'superadmin' ? 'superadmin' : 'user',
        is_active: true,
      });

      // Find free or enterprise plan
      const { SubscriptionPlan, Workspace, WorkspaceMember, Subscription } = await import('../../database/models');
      const plan = await SubscriptionPlan.findOne({ code: role === 'superadmin' ? 'enterprise' : 'pro' }) ||
                   await SubscriptionPlan.findOne();

      if (plan) {
        const workspace = await Workspace.create({
          name: `${user.first_name}'s Workspace`,
          slug: `ws-${user.telegram_id}-${Date.now().toString(36)}`,
          owner_id: user._id,
          owner_telegram_id: user.telegram_id,
          plan_id: plan._id,
          status: 'active',
        });

        await WorkspaceMember.create({
          workspace_id: workspace._id,
          user_id: user._id,
          user_telegram_id: user.telegram_id,
          role: 'owner',
          status: 'active',
        });

        const oneMonth = new Date();
        oneMonth.setMonth(oneMonth.getMonth() + 1);

        await Subscription.create({
          workspace_id: workspace._id,
          plan_id: plan._id,
          status: 'active',
          current_period_start: new Date(),
          current_period_end: oneMonth,
          payment_provider: 'manual',
        });
      }
    }

    const token = AuthService.generateToken({
      userId: user._id.toString(),
      telegramId: user.telegram_id,
      role: user.role,
    });

    const member = await WorkspaceMember.findOne({ user_id: user._id, status: 'active' });

    res.json({
      user,
      token,
      workspaceId: member?.workspace_id?.toString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export const authRouter = router;
