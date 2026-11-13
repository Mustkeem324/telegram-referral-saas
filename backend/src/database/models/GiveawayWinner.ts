import mongoose, { Document, Schema } from 'mongoose';

export type WinnerSelectionMethod = 'random' | 'weighted' | 'points' | 'manual';
export type WinnerStatus = 'selected' | 'notified' | 'claimed' | 'disqualified' | 'replaced';

export interface IGiveawayWinner extends Document {
  workspace_id: mongoose.Types.ObjectId;
  campaign_id: mongoose.Types.ObjectId;
  user_telegram_id: string;
  rank: number;
  prize_details: string;
  selected_method: WinnerSelectionMethod;
  crypto_seed: string; // Cryptographic provably fair seed
  audit_hash: string;
  status: WinnerStatus;
  replaced_by_winner_id?: mongoose.Types.ObjectId;
  replacement_reason?: string;
  created_at: Date;
  updated_at: Date;
}

const GiveawayWinnerSchema = new Schema<IGiveawayWinner>(
  {
    workspace_id: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    campaign_id: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    user_telegram_id: { type: String, required: true, index: true },
    rank: { type: Number, required: true },
    prize_details: { type: String, required: true },
    selected_method: { type: String, enum: ['random', 'weighted', 'points', 'manual'], required: true },
    crypto_seed: { type: String, required: true },
    audit_hash: { type: String, required: true },
    status: {
      type: String,
      enum: ['selected', 'notified', 'claimed', 'disqualified', 'replaced'],
      default: 'selected',
      index: true,
    },
    replaced_by_winner_id: { type: Schema.Types.ObjectId, ref: 'GiveawayWinner' },
    replacement_reason: { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

GiveawayWinnerSchema.index({ campaign_id: 1, rank: 1 });

export const GiveawayWinner = mongoose.model<IGiveawayWinner>('GiveawayWinner', GiveawayWinnerSchema);
