import { NextResponse } from 'next/server';
import { connectDB, UserModel, ReferralModel } from '@/lib/db';

export async function GET() {
  try {
    await connectDB();

    const totalReferrals = await ReferralModel.countDocuments();
    const verifiedReferrals = await ReferralModel.countDocuments({ status: 'verified' });
    const pendingReferrals = await ReferralModel.countDocuments({ status: 'pending' });
    const rejectedReferrals = await ReferralModel.countDocuments({ status: 'rejected' });

    // Calculate real conversion & retention rate
    const conversionRate = totalReferrals > 0 ? Number(((verifiedReferrals / totalReferrals) * 100).toFixed(1)) : 100.0;
    const retentionRate = totalReferrals > 0 ? Number(((verifiedReferrals / (totalReferrals || 1)) * 100).toFixed(1)) : 100.0;

    // Real top referrers from MongoDB
    const topUsers = await UserModel.find({ points: { $gt: 0 } })
      .sort({ points: -1, verified_invites: -1 })
      .limit(5)
      .lean();

    const topReferrers = topUsers.map((u) => ({
      telegram_id: u.telegram_id,
      first_name: u.first_name,
      username: u.username,
      verifiedCount: u.verified_invites || 0,
      points: u.points || 0,
    }));

    // Real daily activity grouping for the last 7 days
    const now = new Date();
    const dailyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const nextD = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
      const dateStr = d.toISOString().split('T')[0];

      const dayTotal = await ReferralModel.countDocuments({
        created_at: { $gte: d, $lt: nextD },
      });
      const dayVerified = await ReferralModel.countDocuments({
        status: 'verified',
        created_at: { $gte: d, $lt: nextD },
      });

      dailyTrend.push({
        _id: dateStr,
        total: dayTotal,
        verified: dayVerified,
      });
    }

    return NextResponse.json({
      summary: {
        total: totalReferrals,
        verified: verifiedReferrals,
        pending: pendingReferrals,
        rejected: rejectedReferrals,
        rewarded: verifiedReferrals,
        reversed: 0,
        conversionRate,
        retentionRate,
      },
      dailyTrend,
      topReferrers,
    });
  } catch (err: any) {
    console.error('Failed to load analytics overview:', err);
    return NextResponse.json({
      summary: {
        total: 0,
        verified: 0,
        pending: 0,
        rejected: 0,
        rewarded: 0,
        reversed: 0,
        conversionRate: 100,
        retentionRate: 100,
      },
      dailyTrend: [],
      topReferrers: [],
    });
  }
}
