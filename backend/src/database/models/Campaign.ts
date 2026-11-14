import mongoose, { Document, Schema } from 'mongoose';

export interface ICampaign extends Document {
  workspace_id: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  description?: string;
  type: 'referral' | 'giveaway' | 'hybrid';
  status: 'draft' | 'active' | 'paused' | 'ended';
  start_date: Date;
  end_date?: Date;
  total_referrals: number;
  verified_referrals: number;
  total_giveaway_entries: number;
  reward_policy: {
    points_per_referral: number;
    hold_period_hours: number;
    retention_period_days: number;
    allow_custom_rewards: boolean;
    premium_multiplier: number;
    premium_fast_track: boolean;
    require_premium_only: boolean;
  };
  fraud_rules: {
    max_referrals_per_ip_per_hour: number;
    max_referrals_per_user_per_day: number;
    require_verified_phone: boolean;
    auto_hold_suspicious: boolean;
    suspicious_threshold_score: number;
  };
  branding: {
    welcome_message?: string;
    referral_message_template?: string;
    rules_message?: string;
  };
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    workspace_id: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    title: { type: String, required: true },
    slug: { type: String, required: true, index: true },
    description: { type: String },
    type: { type: String, enum: ['referral', 'giveaway', 'hybrid'], default: 'referral', index: true },
    status: { type: String, enum: ['draft', 'active', 'paused', 'ended'], default: 'active', index: true },
    start_date: { type: Date, default: Date.now },
    end_date: { type: Date },
    total_referrals: { type: Number, default: 0 },
    verified_referrals: { type: Number, default: 0 },
    total_giveaway_entries: { type: Number, default: 0 },
    reward_policy: {
      points_per_referral: { type: Number, default: 10 },
      hold_period_hours: { type: Number, default: 0 },
      retention_period_days: { type: Number, default: 0 },
      allow_custom_rewards: { type: Boolean, default: true },
      premium_multiplier: { type: Number, default: 2 },
      premium_fast_track: { type: Boolean, default: true },
      require_premium_only: { type: Boolean, default: false },
    },
    fraud_rules: {
      max_referrals_per_ip_per_hour: { type: Number, default: 5 },
      max_referrals_per_user_per_day: { type: Number, default: 50 },
      require_verified_phone: { type: Boolean, default: false },
      auto_hold_suspicious: { type: Boolean, default: true },
      suspicious_threshold_score: { type: Number, default: 60 },
    },
    branding: {
      welcome_message: { type: String },
      referral_message_template: { type: String },
      rules_message: { type: String },
    },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

CampaignSchema.index({ workspace_id: 1, slug: 1 }, { unique: true });
CampaignSchema.index({ workspace_id: 1, status: 1 });

export const Campaign = mongoose.model<ICampaign>('Campaign', CampaignSchema);
