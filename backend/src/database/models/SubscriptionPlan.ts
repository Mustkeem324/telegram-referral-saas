import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscriptionPlan extends Document {
  name: string; // 'Free' | 'Pro' | 'Business' | 'Enterprise'
  code: 'free' | 'pro' | 'business' | 'enterprise';
  description: string;
  price_monthly_usd: number;
  price_yearly_usd: number;
  telegram_stars_monthly: number;
  telegram_stars_yearly: number;
  max_active_campaigns: number;
  max_connected_chats: number;
  max_verified_referrals_monthly: number;
  features: {
    advanced_analytics: boolean;
    custom_branding: boolean;
    api_access: boolean;
    team_access: boolean;
    automated_rewards: boolean;
    anti_fraud_tier: 'basic' | 'standard' | 'advanced' | 'enterprise';
    csv_export: boolean;
  };
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    name: { type: String, required: true },
    code: { type: String, enum: ['free', 'pro', 'business', 'enterprise'], required: true, unique: true },
    description: { type: String, required: true },
    price_monthly_usd: { type: Number, required: true },
    price_yearly_usd: { type: Number, required: true },
    telegram_stars_monthly: { type: Number, required: true },
    telegram_stars_yearly: { type: Number, required: true },
    max_active_campaigns: { type: Number, required: true },
    max_connected_chats: { type: Number, required: true },
    max_verified_referrals_monthly: { type: Number, required: true },
    features: {
      advanced_analytics: { type: Boolean, default: false },
      custom_branding: { type: Boolean, default: false },
      api_access: { type: Boolean, default: false },
      team_access: { type: Boolean, default: false },
      automated_rewards: { type: Boolean, default: false },
      anti_fraud_tier: { type: String, default: 'basic' },
      csv_export: { type: Boolean, default: false },
    },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const SubscriptionPlan = mongoose.model<ISubscriptionPlan>('SubscriptionPlan', SubscriptionPlanSchema);
