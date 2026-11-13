import mongoose, { Document, Schema } from 'mongoose';

export interface IReferralCode extends Document {
  workspace_id: mongoose.Types.ObjectId;
  campaign_id: mongoose.Types.ObjectId;
  user_telegram_id: string; // Referrer's Telegram ID
  referral_code: string;
  clicks_count: number;
  joins_count: number;
  verified_count: number;
  created_at: Date;
  updated_at: Date;
}

const ReferralCodeSchema = new Schema<IReferralCode>(
  {
    workspace_id: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    campaign_id: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    user_telegram_id: { type: String, required: true, index: true },
    referral_code: { type: String, required: true, unique: true, index: true },
    clicks_count: { type: Number, default: 0 },
    joins_count: { type: Number, default: 0 },
    verified_count: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

ReferralCodeSchema.index({ campaign_id: 1, user_telegram_id: 1 }, { unique: true });

export const ReferralCode = mongoose.model<IReferralCode>('ReferralCode', ReferralCodeSchema);
