import mongoose, { Document, Schema } from 'mongoose';

export interface IGiveawayEntry extends Document {
  workspace_id: mongoose.Types.ObjectId;
  campaign_id: mongoose.Types.ObjectId;
  user_telegram_id: string;
  entry_count: number; // calculated from referrals or points
  referral_count: number;
  points_spent: number;
  is_eligible: boolean;
  disqualification_reason?: string;
  created_at: Date;
  updated_at: Date;
}

const GiveawayEntrySchema = new Schema<IGiveawayEntry>(
  {
    workspace_id: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    campaign_id: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    user_telegram_id: { type: String, required: true, index: true },
    entry_count: { type: Number, default: 1 },
    referral_count: { type: Number, default: 0 },
    points_spent: { type: Number, default: 0 },
    is_eligible: { type: Boolean, default: true, index: true },
    disqualification_reason: { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

GiveawayEntrySchema.index({ campaign_id: 1, user_telegram_id: 1 }, { unique: true });

export const GiveawayEntry = mongoose.model<IGiveawayEntry>('GiveawayEntry', GiveawayEntrySchema);
