import mongoose, { Document, Schema } from 'mongoose';

export type FraudEventType =
  | 'self_referral'
  | 'rapid_joins'
  | 'suspicious_leave'
  | 'duplicate_account'
  | 'token_farming'
  | 'failed_verifications'
  | 'reused_reward'
  | 'anomalous_burst';

export interface IFraudEvent extends Document {
  workspace_id: mongoose.Types.ObjectId;
  campaign_id?: mongoose.Types.ObjectId;
  user_telegram_id: string;
  event_type: FraudEventType;
  risk_score: number;
  details: Record<string, any>;
  resolved: boolean;
  resolution_action?: 'dismissed' | 'rejected_referral' | 'held_rewards' | 'banned_user';
  resolved_by?: mongoose.Types.ObjectId;
  resolved_at?: Date;
  created_at: Date;
}

const FraudEventSchema = new Schema<IFraudEvent>(
  {
    workspace_id: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    campaign_id: { type: Schema.Types.ObjectId, ref: 'Campaign', index: true },
    user_telegram_id: { type: String, required: true, index: true },
    event_type: {
      type: String,
      enum: [
        'self_referral',
        'rapid_joins',
        'suspicious_leave',
        'duplicate_account',
        'token_farming',
        'failed_verifications',
        'reused_reward',
        'anomalous_burst',
      ],
      required: true,
      index: true,
    },
    risk_score: { type: Number, required: true },
    details: { type: Schema.Types.Mixed },
    resolved: { type: Boolean, default: false, index: true },
    resolution_action: {
      type: String,
      enum: ['dismissed', 'rejected_referral', 'held_rewards', 'banned_user'],
    },
    resolved_by: { type: Schema.Types.ObjectId, ref: 'User' },
    resolved_at: { type: Date },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

FraudEventSchema.index({ workspace_id: 1, resolved: 1, created_at: -1 });

export const FraudEvent = mongoose.model<IFraudEvent>('FraudEvent', FraudEventSchema);
