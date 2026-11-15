import { NextRequest, NextResponse } from 'next/server';
import { getCampaignsList, createCampaignRecord } from '@/lib/db';

// GET: Real campaigns from MongoDB or serverless fallback
export async function GET() {
  try {
    const campaigns = await getCampaignsList('default_ws');
    return NextResponse.json(campaigns);
  } catch (err: any) {
    console.error('Failed to get campaigns:', err);
    return NextResponse.json([]);
  }
}

// POST: Create a new real campaign in MongoDB or serverless fallback
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const campaign = await createCampaignRecord({
      workspace_id: body.workspace_id || 'default_ws',
      title: body.title,
      description: body.description,
      type: body.type || 'standard',
      status: 'active',
      reward_policy: body.reward_policy || {
        points_per_referral: body.points_per_referral || 10,
        retention_period_days: body.retention_period_days || 2,
        hold_period_hours: body.hold_period_hours || 0,
        allow_custom_rewards: true,
        premium_multiplier: body.premium_multiplier || 2,
        premium_fast_track: false,
        require_premium_only: false,
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (err: any) {
    console.error('Failed to create campaign:', err);
    return NextResponse.json({ error: err.message || 'Failed to create campaign' }, { status: 500 });
  }
}
