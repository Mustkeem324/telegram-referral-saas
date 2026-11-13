import mongoose, { Document, Schema } from 'mongoose';

export interface IReferralLink extends Document {
  workspace_id: mongoose.Types.ObjectId;
  campaign_id: mongoose.Types.ObjectId;
  referrer_telegram_id: string; // The user who owns this invite link
  chat_id: string; // The channel or group this invite link is created for
  invite_link: string; // e.g., "https://t.me/+AbCdEfGhIj"
  telegram_invite_link_name?: string;
  is_revoked: boolean;
  expires_at?: Date;
  member_limit?: number;
  created_at: Date;
  updated_at: Date;
}

const ReferralLinkSchema = new Schema<IReferralLink>(
  {
    workspace_id: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    campaign_id: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    referrer_telegram_id: { type: String, required: true, index: true },
    chat_id: { type: String, required: true, index: true },
    invite_link: { type: String, required: true, unique: true, index: true },
    telegram_invite_link_name: { type: String },
    is_revoked: { type: Boolean, default: false, index: true },
    expires_at: { type: Date },
    member_limit: { type: Number },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// One invite link per user per chat per campaign
ReferralLinkSchema.index({ campaign_id: 1, referrer_telegram_id: 1, chat_id: 1 }, { unique: true });

export const ReferralLink = mongoose.model<IReferralLink>('ReferralLink', ReferralLinkSchema);
