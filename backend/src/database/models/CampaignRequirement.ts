import mongoose, { Document, Schema } from 'mongoose';

export interface ICampaignRequirement extends Document {
  workspace_id: mongoose.Types.ObjectId;
  campaign_id: mongoose.Types.ObjectId;
  chat_id: string; // telegram chat ID
  is_mandatory: boolean;
  min_retention_days: number;
  order_index: number;
  created_at: Date;
  updated_at: Date;
}

const CampaignRequirementSchema = new Schema<ICampaignRequirement>(
  {
    workspace_id: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    campaign_id: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    chat_id: { type: String, required: true },
    is_mandatory: { type: Boolean, default: true },
    min_retention_days: { type: Number, default: 0 },
    order_index: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

CampaignRequirementSchema.index({ campaign_id: 1, chat_id: 1 }, { unique: true });

export const CampaignRequirement = mongoose.model<ICampaignRequirement>(
  'CampaignRequirement',
  CampaignRequirementSchema
);
