import mongoose, { Document, Schema } from 'mongoose';

export interface IMysteryBox extends Document {
  workspace_id: mongoose.Types.ObjectId;
  campaign_id?: mongoose.Types.ObjectId;
  user_telegram_id: string;
  box_tier: 'bronze' | 'silver' | 'gold' | 'cyber';
  status: 'unopened' | 'opened';
  reward_type: 'bonus_points' | 'stars' | 'vip_badge' | 'multiplier_boost';
  reward_value: number;
  reward_title: string;
  unlocked_reason: string;
  unlocked_at: Date;
  opened_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const MysteryBoxSchema = new Schema<IMysteryBox>(
  {
    workspace_id: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    campaign_id: { type: Schema.Types.ObjectId, ref: 'Campaign', index: true },
    user_telegram_id: { type: String, required: true, index: true },
    box_tier: { type: String, enum: ['bronze', 'silver', 'gold', 'cyber'], default: 'bronze', index: true },
    status: { type: String, enum: ['unopened', 'opened'], default: 'unopened', index: true },
    reward_type: { type: String, enum: ['bonus_points', 'stars', 'vip_badge', 'multiplier_boost'], required: true },
    reward_value: { type: Number, required: true },
    reward_title: { type: String, required: true },
    unlocked_reason: { type: String, default: 'Earned from 3 verified referrals' },
    unlocked_at: { type: Date, default: Date.now },
    opened_at: { type: Date },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

MysteryBoxSchema.index({ user_telegram_id: 1, status: 1 });

export const MysteryBox = mongoose.model<IMysteryBox>('MysteryBox', MysteryBoxSchema);
