import { SubscriptionPlan, User, Workspace, WorkspaceMember, Subscription } from './models';
import { logger } from '../utils/logger';
import { config } from '../config';

export async function seedInitialData(): Promise<void> {
  // Seed Plans
  const plans = [
    {
      name: 'Free',
      code: 'free',
      description: 'Perfect for creators getting started with Telegram referrals.',
      price_monthly_usd: 0,
      price_yearly_usd: 0,
      telegram_stars_monthly: 0,
      telegram_stars_yearly: 0,
      max_active_campaigns: 1,
      max_connected_chats: 1,
      max_verified_referrals_monthly: 100,
      features: {
        advanced_analytics: false,
        custom_branding: false,
        api_access: false,
        team_access: false,
        automated_rewards: false,
        anti_fraud_tier: 'basic',
        csv_export: false,
      },
    },
    {
      name: 'Pro',
      code: 'pro',
      description: 'Ideal for growing Telegram communities and active channel creators.',
      price_monthly_usd: 29,
      price_yearly_usd: 290,
      telegram_stars_monthly: 1500,
      telegram_stars_yearly: 15000,
      max_active_campaigns: 10,
      max_connected_chats: 5,
      max_verified_referrals_monthly: 5000,
      features: {
        advanced_analytics: true,
        custom_branding: false,
        api_access: false,
        team_access: false,
        automated_rewards: true,
        anti_fraud_tier: 'advanced',
        csv_export: true,
      },
    },
    {
      name: 'Business',
      code: 'business',
      description: 'For large crypto, gaming, and media communities requiring high throughput.',
      price_monthly_usd: 99,
      price_yearly_usd: 990,
      telegram_stars_monthly: 5000,
      telegram_stars_yearly: 50000,
      max_active_campaigns: 50,
      max_connected_chats: 25,
      max_verified_referrals_monthly: 50000,
      features: {
        advanced_analytics: true,
        custom_branding: true,
        api_access: true,
        team_access: true,
        automated_rewards: true,
        anti_fraud_tier: 'advanced',
        csv_export: true,
      },
    },
    {
      name: 'Enterprise',
      code: 'enterprise',
      description: 'Custom infrastructure, dedicated node support, and unlimited scale.',
      price_monthly_usd: 299,
      price_yearly_usd: 2990,
      telegram_stars_monthly: 15000,
      telegram_stars_yearly: 150000,
      max_active_campaigns: 999,
      max_connected_chats: 999,
      max_verified_referrals_monthly: 1000000,
      features: {
        advanced_analytics: true,
        custom_branding: true,
        api_access: true,
        team_access: true,
        automated_rewards: true,
        anti_fraud_tier: 'enterprise',
        csv_export: true,
      },
    },
  ];

  for (const planData of plans) {
    await SubscriptionPlan.findOneAndUpdate(
      { code: planData.code },
      { $set: planData },
      { upsert: true, new: true }
    );
  }
  logger.info('Subscription plans seeded successfully');

  // Seed default superadmin if configured
  if (config.superAdmin.telegramId) {
    const adminUser = await User.findOneAndUpdate(
      { telegram_id: config.superAdmin.telegramId },
      {
        $setOnInsert: {
          telegram_id: config.superAdmin.telegramId,
          first_name: 'Platform',
          last_name: 'SuperAdmin',
          username: 'superadmin',
          role: 'superadmin',
          is_active: true,
        },
      },
      { upsert: true, new: true }
    );

    // Ensure default workspace for superadmin
    const enterprisePlan = (await SubscriptionPlan.findOne({ code: 'enterprise' })) || (await SubscriptionPlan.findOne());
    if (enterprisePlan) {
      let ws = await Workspace.findOne({
        $or: [{ owner_id: adminUser._id }, { slug: 'superadmin-workspace' }],
      });
      if (!ws) {
        ws = await Workspace.create({
          name: 'SuperAdmin Workspace',
          slug: 'superadmin-workspace',
          owner_id: adminUser._id,
          owner_telegram_id: adminUser.telegram_id,
          plan_id: enterprisePlan._id,
          status: 'active',
        });
      } else if (String(ws.owner_id) !== String(adminUser._id)) {
        ws.owner_id = adminUser._id;
        ws.owner_telegram_id = adminUser.telegram_id;
        ws.plan_id = enterprisePlan._id;
        await ws.save();
      }

      await WorkspaceMember.findOneAndUpdate(
        { workspace_id: ws._id, user_id: adminUser._id },
        {
          $set: {
            user_telegram_id: adminUser.telegram_id,
            role: 'owner',
            status: 'active',
          },
        },
        { upsert: true }
      );
    }
    logger.info('Superadmin initialized');
  }
}
