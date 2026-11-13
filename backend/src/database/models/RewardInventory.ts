import mongoose, { Document, Schema } from 'mongoose';

export interface IRewardInventory extends Document {
  workspace_id: mongoose.Types.ObjectId;
  reward_id: mongoose.Types.ObjectId;
  code_or_payload: string; // The specific key, code, or license
  is_claimed: boolean;
  claimed_by_user_telegram_id?: string;
  claimed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const RewardInventorySchema = new Schema<IRewardInventory>(
  {
    workspace_id: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    reward_id: { type: Schema.Types.ObjectId, ref: 'Reward', required: true, index: true },
    code_or_payload: { type: String, required: true },
    is_claimed: { type: Boolean, default: false, index: true },
    claimed_by_user_telegram_id: { type: String, index: true },
    claimed_at: { type: Date },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

RewardInventorySchema.index({ reward_id: 1, is_claimed: 1 });

export const RewardInventory = mongoose.model<IRewardInventory>('RewardInventory', RewardInventorySchema);
