import mongoose, { Document, Schema } from 'mongoose';

export interface IUsageCounter extends Document {
  workspace_id: mongoose.Types.ObjectId;
  period_year_month: string; // e.g., "2026-11"
  active_campaigns_count: number;
  connected_chats_count: number;
  verified_referrals_count: number;
  api_requests_count: number;
  updated_at: Date;
}

const UsageCounterSchema = new Schema<IUsageCounter>(
  {
    workspace_id: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    period_year_month: { type: String, required: true, index: true },
    active_campaigns_count: { type: Number, default: 0 },
    connected_chats_count: { type: Number, default: 0 },
    verified_referrals_count: { type: Number, default: 0 },
    api_requests_count: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: false, updatedAt: 'updated_at' } }
);

UsageCounterSchema.index({ workspace_id: 1, period_year_month: 1 }, { unique: true });

export const UsageCounter = mongoose.model<IUsageCounter>('UsageCounter', UsageCounterSchema);
