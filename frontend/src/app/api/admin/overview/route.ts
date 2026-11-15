import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    overview: {
      totalUsers: 1420,
      activeUsers: 1395,
      bannedUsers: 25,
      totalWorkspaces: 310,
      activeSubscriptions: 85,
      totalCampaigns: 540,
      totalReferrals: 12480,
      totalFraudEvents: 14,
      openTickets: 3,
      totalRevenue: 4850,
    },
  });
}
