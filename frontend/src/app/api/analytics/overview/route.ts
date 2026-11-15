import { NextResponse } from 'next/server';
import { getOverviewAnalytics } from '@/lib/db';

export async function GET() {
  try {
    const data = await getOverviewAnalytics();

    return NextResponse.json({
      summary: {
        total: data.totalReferrals,
        verified: data.verifiedReferrals,
        pending: data.pendingReferrals,
        rejected: data.rejectedReferrals,
        rewarded: data.verifiedReferrals,
        reversed: 0,
        conversionRate: data.conversionRate,
        retentionRate: data.retentionRate,
      },
      dailyTrend: data.dailyTrend,
      topReferrers: data.topReferrers,
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
