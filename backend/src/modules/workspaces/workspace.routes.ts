import { Router } from 'express';
import { requireAuth, requireWorkspace } from '../auth/auth.middleware';
import {
  Workspace,
  WorkspaceMember,
  TelegramChat,
  ConnectedBot,
  SubscriptionPlan,
  Subscription,
  UsageCounter,
  AuditLog,
} from '../../database/models';
import { TelegramService } from '../telegram/telegram.service';
import { encryptToken } from '../../utils/crypto';
import crypto from 'crypto';

const router = Router();

// List user workspaces
router.get('/', requireAuth, async (req, res) => {
  try {
    const memberships = await WorkspaceMember.find({ user_id: req.user!._id, status: 'active' }).populate('workspace_id');
    const workspaces = memberships
      .filter((m) => m.workspace_id)
      .map((m) => ({
        ...(m.workspace_id as any).toObject(),
        role: m.role,
      }));
    res.json(workspaces);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create workspace
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Workspace name is required.' });

    const freePlan = await SubscriptionPlan.findOne({ code: 'free' });
    if (!freePlan) return res.status(500).json({ error: 'Default plan missing.' });

    const slug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString(36)}`;

    const workspace = await Workspace.create({
      name,
      slug,
      owner_id: req.user!._id,
      owner_telegram_id: req.user!.telegram_id,
      plan_id: freePlan._id,
      status: 'active',
    });

    await WorkspaceMember.create({
      workspace_id: workspace._id,
      user_id: req.user!._id,
      user_telegram_id: req.user!.telegram_id,
      role: 'owner',
      status: 'active',
    });

    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    await Subscription.create({
      workspace_id: workspace._id,
      plan_id: freePlan._id,
      status: 'active',
      current_period_start: new Date(),
      current_period_end: nextMonth,
      payment_provider: 'manual',
    });

    await AuditLog.create({
      workspace_id: workspace._id,
      actor_id: req.user!._id,
      actor_telegram_id: req.user!.telegram_id,
      actor_type: 'user',
      action: 'workspace_created',
      resource_type: 'workspace',
      resource_id: workspace._id.toString(),
    });

    res.status(201).json(workspace);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get workspace details
router.get('/:workspaceId', requireAuth, requireWorkspace('viewer'), async (req, res) => {
  try {
    const ws = await Workspace.findById(req.workspace!._id).populate('plan_id');
    res.json({
      workspace: ws,
      role: req.userRole,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update workspace settings
router.put('/:workspaceId', requireAuth, requireWorkspace('admin'), async (req, res) => {
  try {
    const { name, branding_name, custom_domain, webhook_url, support_telegram } = req.body;
    const ws = req.workspace!;

    if (name) ws.name = name;
    if (!ws.settings) ws.settings = {};
    if (branding_name !== undefined) ws.settings.branding_name = branding_name;
    if (custom_domain !== undefined) ws.settings.custom_domain = custom_domain;
    if (webhook_url !== undefined) ws.settings.webhook_url = webhook_url;
    if (support_telegram !== undefined) ws.settings.support_telegram = support_telegram;

    await ws.save();
    res.json(ws);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List connected chats
router.get('/:workspaceId/chats', requireAuth, requireWorkspace('viewer'), async (req, res) => {
  try {
    const chats = await TelegramChat.find({ workspace_id: req.workspace!._id }).sort({ created_at: -1 });
    res.json(chats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Verify & connect a Telegram chat (Channel or Group)
router.post('/:workspaceId/chats/verify', requireAuth, requireWorkspace('admin'), async (req, res) => {
  try {
    const { chatId } = req.body;
    if (!chatId) return res.status(400).json({ error: 'chatId is required.' });

    // Check plan limits
    const ws = await Workspace.findById(req.workspace!._id).populate('plan_id');
    const plan: any = ws?.plan_id;
    const currentChatCount = await TelegramChat.countDocuments({ workspace_id: ws!._id });

    if (plan && currentChatCount >= plan.max_connected_chats) {
      return res.status(403).json({
        error: `Your current plan (${plan.name}) allows up to ${plan.max_connected_chats} connected chats. Please upgrade your subscription.`,
      });
    }

    // Check custom bot if configured
    const customBot = await ConnectedBot.findOne({ workspace_id: ws!._id, is_active: true });
    let customToken: string | undefined = undefined;
    if (customBot && customBot.token_encrypted && customBot.token_iv && customBot.token_tag) {
      const { decryptToken } = await import('../../utils/crypto');
      customToken = decryptToken(customBot.token_encrypted, customBot.token_iv, customBot.token_tag);
    }

    // Verify via Telegram Bot API
    let verification;
    try {
      verification = await TelegramService.verifyChatPermissions(String(chatId), customToken);
    } catch (apiErr: any) {
      // In development or test without public internet webhook, allow mocked verification if chatId is in mock format
      if (process.env.NODE_ENV !== 'production' && String(chatId).startsWith('-100')) {
        verification = {
          isMember: true,
          isAdmin: true,
          canInviteUsers: true,
          chatTitle: `Channel ${chatId}`,
          chatType: 'channel',
          username: `channel_${chatId.replace(/[^0-9]/g, '')}`,
        };
      } else {
        return res.status(400).json({ error: apiErr.message });
      }
    }

    if (!verification.isAdmin) {
      return res.status(400).json({
        error: 'The bot must be added to the chat as an Administrator.',
        details: verification,
      });
    }

    if (!verification.canInviteUsers) {
      return res.status(400).json({
        error: 'The bot must have "can_invite_users" (Invite Users via Link) permission enabled.',
        details: verification,
      });
    }

    const chat = await TelegramChat.findOneAndUpdate(
      { workspace_id: ws!._id, chat_id: String(chatId) },
      {
        $set: {
          title: verification.chatTitle,
          type: verification.chatType as any,
          username: verification.username,
          is_bot_admin: true,
          permissions: {
            can_invite_users: verification.canInviteUsers,
            can_manage_chat: true,
          },
          verification_status: 'verified',
          connected_by: req.user!._id,
          last_verified_at: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    // Update usage counter
    const currentMonth = new Date().toISOString().slice(0, 7);
    await UsageCounter.findOneAndUpdate(
      { workspace_id: ws!._id, period_year_month: currentMonth },
      { $inc: { connected_chats_count: 1 } },
      { upsert: true }
    );

    res.json(chat);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Custom bot connection (encrypted storage)
router.post('/:workspaceId/custom-bot', requireAuth, requireWorkspace('admin'), async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Valid Telegram bot token is required.' });
    }

    const botInfo = await TelegramService.verifyCustomBotToken(token);
    const { encrypted, iv, tag } = encryptToken(token);
    const webhookSecret = crypto.randomBytes(24).toString('hex');

    const connectedBot = await ConnectedBot.findOneAndUpdate(
      { workspace_id: req.workspace!._id },
      {
        $set: {
          bot_id: botInfo.botId,
          bot_username: botInfo.botUsername,
          first_name: botInfo.firstName,
          token_encrypted: encrypted,
          token_iv: iv,
          token_tag: tag,
          webhook_secret: webhookSecret,
          is_primary: false,
          is_active: true,
          health_status: 'healthy',
          last_health_check_at: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      bot: {
        bot_id: connectedBot.bot_id,
        bot_username: connectedBot.bot_username,
        first_name: connectedBot.first_name,
        health_status: connectedBot.health_status,
      },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export const workspaceRouter = router;
