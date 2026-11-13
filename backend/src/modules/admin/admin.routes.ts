import { Router } from 'express';
import { requireAuth, requireSuperAdmin } from '../auth/auth.middleware';
import {
  User,
  Workspace,
  Subscription,
  SubscriptionPlan,
  Payment,
  Campaign,
  Referral,
  FraudEvent,
  SupportTicket,
  WebhookEvent,
  AuditLog,
} from '../../database/models';
import mongoose from 'mongoose';

const router = Router();

// Apply superadmin guard to all routes
router.use(requireAuth, requireSuperAdmin);

// Super Admin Overview Statistics
router.get('/overview', async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      bannedUsers,
      totalWorkspaces,
      activeSubscriptions,
      totalCampaigns,
      totalReferrals,
      totalFraudEvents,
      openTickets,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ is_active: true }),
      User.countDocuments({ is_active: false }),
      Workspace.countDocuments(),
      Subscription.countDocuments({ status: 'active' }),
      Campaign.countDocuments(),
      Referral.countDocuments(),
      FraudEvent.countDocuments({ resolved: false }),
      SupportTicket.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
    ]);

    // Calculate revenue from succeeded payments
    const revenueAgg = await Payment.aggregate([
      { $match: { status: 'succeeded' } },
      { $group: { _id: '$currency', total: { $sum: '$amount' } } },
    ]);

    res.json({
      overview: {
        totalUsers,
        activeUsers,
        bannedUsers,
        totalWorkspaces,
        activeSubscriptions,
        totalCampaigns,
        totalReferrals,
        unresolvedFraudEvents: totalFraudEvents,
        openTickets,
      },
      revenue: revenueAgg,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Manage Users (List, Filter, Ban, Unban)
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const search = req.query.search as string;

    const filter: any = {};
    if (search) {
      filter.$or = [
        { first_name: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { telegram_id: search },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({
      data: users,
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

// Ban or unban user
router.post('/users/:userId/status', async (req, res) => {
  try {
    const { is_active, ban_reason } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.is_active = Boolean(is_active);
    if (!is_active) {
      user.banned_at = new Date();
      user.ban_reason = ban_reason || 'Banned by Super Administrator';
    } else {
      user.banned_at = undefined;
      user.ban_reason = undefined;
    }
    await user.save();

    await AuditLog.create({
      actor_id: req.user!._id,
      actor_telegram_id: req.user!.telegram_id,
      actor_type: 'admin',
      action: is_active ? 'user_unbanned' : 'user_banned',
      resource_type: 'user',
      resource_id: user._id.toString(),
      diff: { is_active, ban_reason },
    });

    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Manage Plans (Update pricing, limits, features)
router.put('/plans/:planId', async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndUpdate(
      req.params.planId,
      { $set: req.body },
      { new: true }
    );
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    res.json(plan);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// System Health & Queue Monitoring
router.get('/health', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';

    const recentWebhooks = await WebhookEvent.find().sort({ received_at: -1 }).limit(10);
    const recentAuditLogs = await AuditLog.find().sort({ created_at: -1 }).limit(10);

    res.json({
      timestamp: new Date(),
      database: {
        status: dbStatus,
        host: mongoose.connection.host,
        name: mongoose.connection.name,
      },
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
      },
      recentWebhooks,
      recentAuditLogs,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Support Ticket Management
router.get('/tickets', async (req, res) => {
  try {
    const tickets = await SupportTicket.find().sort({ created_at: -1 }).limit(50);
    res.json(tickets);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reply to support ticket
router.post('/tickets/:ticketId/reply', async (req, res) => {
  try {
    const { message, status } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    const ticket = await SupportTicket.findById(req.params.ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    ticket.messages.push({
      sender_id: req.user!._id,
      sender_telegram_id: req.user!.telegram_id,
      sender_role: 'admin',
      message,
      timestamp: new Date(),
    });

    if (status) ticket.status = status;
    await ticket.save();

    // Send Telegram notification to user
    const { TelegramService } = await import('../telegram/telegram.service');
    TelegramService.sendMessage(
      ticket.user_telegram_id,
      `📩 **Support Reply from Platform Team:**\n\n${message}`
    ).catch(() => {});

    res.json(ticket);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export const adminRouter = router;
