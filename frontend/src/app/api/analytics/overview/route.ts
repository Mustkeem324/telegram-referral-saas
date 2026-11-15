import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    summary: {
      total: 142,
      verified: 118,
      pending: 18,
      rejected: 6,
      rewarded: 45,
      reversed: 0,
      conversionRate: 83.1,
      retentionRate: 88.5,
    },
    dailyTrend: [
      { _id: '2026-11-09', total: 12, verified: 10 },
      { _id: '2026-11-10', total: 18, verified: 15 },
      { _id: '2026-11-11', total: 24, verified: 20 },
      { _id: '2026-11-12', total: 31, verified: 27 },
      { _id: '2026-11-13', total: 28, verified: 23 },
      { _id: '2026-11-14', total: 35, verified: 29 },
      { _id: '2026-11-15', total: 42, verified: 38 },
    ],
    topReferrers: [
      { telegram_id: '1951052299', first_name: 'NX Dev', verifiedCount: 48, points: 480 },
      { telegram_id: '8005858260', first_name: 'Alex Crypto', verifiedCount: 35, points: 350 },
      { telegram_id: '9928172635', first_name: 'Elena Web3', verifiedCount: 24, points: 240 },
    ],
  });
}
