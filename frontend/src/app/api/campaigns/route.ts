import { NextRequest, NextResponse } from 'next/server';
import { connectDB, CampaignModel } from '@/lib/db';

// GET: Real campaigns from MongoDB
export async function GET() {
  try {
    await connectDB();
    const campaigns = await CampaignModel.find().sort({ created_at: -1 }).lean();

    // If no campaigns exist yet, create the default platform campaign
    if (campaigns.length === 0) {
      const defaultCamp = await CampaignModel.create({
        workspace_id: 'default_ws',
        title: 'Community Viral Referral Program',
        description: 'Earn points and unlock milestone rewards for inviting verified members.',
        status: 'active',
        type: 'standard',
        total_referrals: 0,
        verified_referrals: 0,
        reward_policy: {
          points_per_referral: 10,
          retention_period_days: 2,
          hold_period_hours: 0,
          allow_custom_rewards: true,
          premium_multiplier: 2,
          premium_fast_track: false,
          require_premium_only: false,
        },
      });
      return NextResponse.json([defaultCamp]);
    }

    return NextResponse.json(campaigns);
  } catch (err: any) {
    console.error('Failed to get campaigns:', err);
    return NextResponse.json([]);
  }
}

// POST: Create a new real campaign in MongoDB
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const campaign = await CampaignModel.create({
      workspace_id: body.workspace_id || 'default_ws',
      title: body.title,
      description: body.description,
      type: body.type || 'standard',
      status: 'active',
      reward_policy: body.reward_policy || {
        points_per_referral: 10,
        retention_period_days: 2,
        hold_period_hours: 0,
        allow_custom_rewards: true,
        premium_multiplier: 2,
        premium_fast_track: false,
        require_premium_only: false,
      },
      total_referrals: 0,
      verified_referrals: 0,
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (err: any) {
    console.error('Failed to create campaign:', err);
    return NextResponse.json({ error: err.message || 'Failed to create campaign' }, { status: 500 });
  }
}
