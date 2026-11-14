import mongoose, { Document, Schema } from 'mongoose';

export type ReferralStatus =
  | 'pending'
  | 'joined'
  | 'verification_pending'
  | 'verified'
  | 'rejected'
  | 'rewarded'
  | 'reversed';

export interface IReferral extends Document {
  workspace_id: mongoose.Types.ObjectId;
  campaign_id: mongoose.Types.ObjectId;
  referrer_telegram_id: string; // The person who shared the link
  referred_telegram_id: string; // The newcomer who joined
  chat_id: string; // The specific chat where join happened
  referral_link_id?: mongoose.Types.ObjectId;
  invite_link_used?: string;
  status: ReferralStatus;
  risk_score: number;
  fraud_reasons: string[];
  points_awarded: number;
  is_premium: boolean;
  is_premium_multiplier_applied: boolean;
  joined_at?: Date;
  verified_at?: Date;
  rewarded_at?: Date;
  rejected_at?: Date;
  reversed_at?: Date;
  reversal_reason?: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

const ReferralSchema = new Schema<IReferral>(
  {
    workspace_id: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    campaign_id: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    referrer_telegram_id: { type: String, required: true, index: true },
    referred_telegram_id: { type: String, required: true, index: true },
    chat_id: { type: String, required: true },
    referral_link_id: { type: Schema.Types.ObjectId, ref: 'ReferralLink' },
    invite_link_used: { type: String },
    status: {
      type: String,
      enum: ['pending', 'joined', 'verification_pending', 'verified', 'rejected', 'rewarded', 'reversed'],
      default: 'joined',
      index: true,
    },
    risk_score: { type: Number, default: 0, index: true },
    fraud_reasons: [{ type: String }],
    points_awarded: { type: Number, default: 0 },
    is_premium: { type: Boolean, default: false, index: true },
    is_premium_multiplier_applied: { type: Boolean, default: false },
    joined_at: { type: Date, default: Date.now },
    verified_at: { type: Date },
    rewarded_at: { type: Date },
    rejected_at: { type: Date },
    reversed_at: { type: Date },
    reversal_reason: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// One referral per referred user per campaign rule
ReferralSchema.index({ campaign_id: 1, referred_telegram_id: 1 }, { unique: true });
ReferralSchema.index({ campaign_id: 1, referrer_telegram_id: 1, status: 1 });
ReferralSchema.index({ workspace_id: 1, status: 1 });

export const Referral = mongoose.model<IReferral>('Referral', ReferralSchema);
