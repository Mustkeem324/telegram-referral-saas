import mongoose, { Document, Schema } from 'mongoose';

export type MembershipStatus = 'joined' | 'left' | 'kicked' | 'verified' | 'restricted' | 'unknown';

export interface IMembershipHistory {
  action: 'joined' | 'left' | 'kicked' | 'verified' | 'rejoined';
  timestamp: Date;
  details?: string;
}

export interface IMembership extends Document {
  workspace_id: mongoose.Types.ObjectId;
  campaign_id: mongoose.Types.ObjectId;
  user_telegram_id: string;
  chat_id: string;
  status: MembershipStatus;
  first_joined_at: Date;
  last_checked_at: Date;
  left_at?: Date;
  is_verified: boolean;
  history: IMembershipHistory[];
  created_at: Date;
  updated_at: Date;
}

const MembershipSchema = new Schema<IMembership>(
  {
    workspace_id: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    campaign_id: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    user_telegram_id: { type: String, required: true, index: true },
    chat_id: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['joined', 'left', 'kicked', 'verified', 'restricted', 'unknown'],
      default: 'joined',
      index: true,
    },
    first_joined_at: { type: Date, default: Date.now },
    last_checked_at: { type: Date, default: Date.now },
    left_at: { type: Date },
    is_verified: { type: Boolean, default: false, index: true },
    history: [
      {
        action: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        details: { type: String },
      },
    ],
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

MembershipSchema.index({ campaign_id: 1, user_telegram_id: 1, chat_id: 1 }, { unique: true });

export const Membership = mongoose.model<IMembership>('Membership', MembershipSchema);
