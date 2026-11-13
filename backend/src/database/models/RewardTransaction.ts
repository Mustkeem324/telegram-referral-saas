import mongoose, { Document, Schema } from 'mongoose';

export type TransactionType = 'credit' | 'debit' | 'reverse';

export interface IRewardTransaction extends Document {
  workspace_id: mongoose.Types.ObjectId;
  campaign_id: mongoose.Types.ObjectId;
  user_telegram_id: string; // The beneficiary
  reward_id?: mongoose.Types.ObjectId;
  referral_id?: mongoose.Types.ObjectId;
  type: TransactionType;
  amount: number; // e.g. points or 1 for items
  unit: 'points' | 'item' | 'ticket';
  transaction_hash: string; // SHA-256 integrity hash
  reference_id?: string;
  delivered_payload?: string; // code, download link or receipt
  reason: string;
  metadata?: Record<string, any>;
  created_at: Date;
}

const RewardTransactionSchema = new Schema<IRewardTransaction>(
  {
    workspace_id: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    campaign_id: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    user_telegram_id: { type: String, required: true, index: true },
    reward_id: { type: Schema.Types.ObjectId, ref: 'Reward' },
    referral_id: { type: Schema.Types.ObjectId, ref: 'Referral' },
    type: { type: String, enum: ['credit', 'debit', 'reverse'], required: true },
    amount: { type: Number, required: true },
    unit: { type: String, enum: ['points', 'item', 'ticket'], default: 'points' },
    transaction_hash: { type: String, required: true, unique: true },
    reference_id: { type: String },
    delivered_payload: { type: String },
    reason: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } } // Append-only ledger!
);

RewardTransactionSchema.index({ campaign_id: 1, user_telegram_id: 1, created_at: -1 });

export const RewardTransaction = mongoose.model<IRewardTransaction>(
  'RewardTransaction',
  RewardTransactionSchema
);
