import mongoose, { Document, Schema } from 'mongoose';

export type RewardType =
  | 'points'
  | 'digital_file'
  | 'software_key'
  | 'coupon_code'
  | 'course_access'
  | 'giveaway_ticket'
  | 'telegram_premium'
  | 'telegram_stars'
  | 'custom'
  | 'manual';

export interface IReward extends Document {
  workspace_id: mongoose.Types.ObjectId;
  campaign_id: mongoose.Types.ObjectId;
  name: string;
  type: RewardType;
  description?: string;
  milestone_referrals_required: number; // e.g. 1, 5, 10, 25, 50 referrals
  points_value?: number;
  delivery_payload?: string; // URL, text, or file reference for standard delivery
  requires_inventory: boolean;
  total_inventory: number;
  claimed_count: number;
  is_active: boolean;
  auto_distribute: boolean;
  created_at: Date;
  updated_at: Date;
}

const RewardSchema = new Schema<IReward>(
  {
    workspace_id: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    campaign_id: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'points',
        'digital_file',
        'software_key',
        'coupon_code',
        'course_access',
        'giveaway_ticket',
        'telegram_premium',
        'telegram_stars',
        'custom',
        'manual',
      ],
      required: true,
    },
    description: { type: String },
    milestone_referrals_required: { type: Number, required: true, index: true },
    points_value: { type: Number, default: 0 },
    delivery_payload: { type: String },
    requires_inventory: { type: Boolean, default: false },
    total_inventory: { type: Number, default: 0 },
    claimed_count: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true, index: true },
    auto_distribute: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

RewardSchema.index({ campaign_id: 1, milestone_referrals_required: 1 });

export const Reward = mongoose.model<IReward>('Reward', RewardSchema);
