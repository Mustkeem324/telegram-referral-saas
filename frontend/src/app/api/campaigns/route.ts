import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json([
    {
      _id: 'camp_alpha_01',
      title: 'Community Viral Alpha Referral Drop',
      status: 'active',
      type: 'standard',
      total_referrals: 142,
      verified_referrals: 118,
      points_per_referral: 10,
      premium_multiplier: 2,
      created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
    {
      _id: 'camp_alpha_02',
      title: 'Telegram Premium Stars Boost Giveaway',
      status: 'active',
      type: 'giveaway',
      total_referrals: 89,
      verified_referrals: 82,
      points_per_referral: 20,
      premium_multiplier: 2,
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
  ]);
}
