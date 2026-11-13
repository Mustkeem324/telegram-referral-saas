import { Router } from 'express';
import { requireAuth, requireWorkspace } from '../auth/auth.middleware';
import {
  Referral,
  ReferralCode,
  Campaign,
  RewardTransaction,
  FraudEvent,
  GiveawayWinner,
} from '../../database/models';
import mongoose from 'mongoose';

const router = Router();

// Comprehensive campaign analytics
router.get('/overview', requireAuth, requireWorkspace('viewer'), async (req, res) => {
  try {
    const workspaceId = req.workspace!._id;
    const campaignId = req.query.campaignId as string;

    const matchFilter: any = { workspace_id: workspaceId };
    if (campaignId && mongoose.Types.ObjectId.isValid(campaignId)) {
      matchFilter.campaign_id = new mongoose.Types.ObjectId(campaignId);
    }

    // 1. Overall Status counts
    const statusCounts = await Referral.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    let total = 0;
    let verified = 0;
    let pending = 0;
    let rejected = 0;
    let rewarded = 0;
    let reversed = 0;

    statusCounts.forEach((s) => {
      total += s.count;
      if (s._id === 'verified') verified += s.count;
      if (s._id === 'rewarded') {
        verified += s.count;
        rewarded += s.count;
      }
      if (s._id === 'pending' || s._id === 'joined' || s._id === 'verification_pending') pending += s.count;
      if (s._id === 'rejected') rejected += s.count;
      if (s._id === 'reversed') reversed += s.count;
    });

    const conversionRate = total > 0 ? ((verified / total) * 100).toFixed(1) : '0.0';

    // 2. Daily Joins time series (Last 14 days)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const dailyJoins = await Referral.aggregate([
      {
        $match: {
          ...matchFilter,
          joined_at: { $gte: fourteenDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$joined_at' } },
          totalJoins: { $sum: 1 },
          verifiedJoins: {
            $sum: {
              $cond: [{ $in: ['$status', ['verified', 'rewarded']] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 3. Top Referrers
    const topReferrers = await Referral.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$referrer_telegram_id',
          totalReferred: { $sum: 1 },
          verifiedCount: {
            $sum: {
              $cond: [{ $in: ['$status', ['verified', 'rewarded']] }, 1, 0],
            },
          },
        },
      },
      { $sort: { verifiedCount: -1 } },
      { $limit: 10 },
    ]);

    // 4. Rewards Distributed Summary
    const rewardTxStats = await RewardTransaction.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$unit',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // 5. Fraud Incidents
    const fraudCount = await FraudEvent.countDocuments({ workspace_id: workspaceId });

    res.json({
      metrics: {
        totalReferrals: total,
        verifiedReferrals: verified,
        pendingReferrals: pending,
        rejectedReferrals: rejected,
        reversedReferrals: reversed,
        conversionRate: `${conversionRate}%`,
        rewardedCount: rewarded,
        fraudIncidents: fraudCount,
      },
      charts: {
        dailyJoins: dailyJoins.map((d) => ({
          date: d._id,
          total: d.totalJoins,
          verified: d.verifiedJoins,
        })),
        topReferrers,
        rewardTxStats,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CSV Export
router.get('/export/csv', requireAuth, requireWorkspace('viewer'), async (req, res) => {
  try {
    const workspaceId = req.workspace!._id;
    const campaignId = req.query.campaignId as string;

    const matchFilter: any = { workspace_id: workspaceId };
    if (campaignId && mongoose.Types.ObjectId.isValid(campaignId)) {
      matchFilter.campaign_id = campaignId;
    }

    const referrals = await Referral.find(matchFilter).sort({ created_at: -1 }).limit(5000);

    const headers = ['Referral ID', 'Campaign ID', 'Referrer ID', 'Referred ID', 'Status', 'Risk Score', 'Points Awarded', 'Joined At', 'Verified At'];
    const rows = referrals.map((r) => [
      r._id.toString(),
      r.campaign_id.toString(),
      r.referrer_telegram_id,
      r.referred_telegram_id,
      r.status,
      r.risk_score,
      r.points_awarded,
      r.joined_at?.toISOString() || '',
      r.verified_at?.toISOString() || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=referrals-${Date.now()}.csv`);
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export const analyticsRouter = router;
