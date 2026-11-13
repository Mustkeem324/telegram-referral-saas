import mongoose, { Document, Schema } from 'mongoose';

export interface IWorkspace extends Document {
  name: string;
  slug: string;
  owner_id: mongoose.Types.ObjectId;
  owner_telegram_id: string;
  plan_id: mongoose.Types.ObjectId;
  status: 'active' | 'suspended';
  settings: {
    branding_name?: string;
    custom_domain?: string;
    webhook_url?: string;
    webhook_secret?: string;
    support_telegram?: string;
  };
  created_at: Date;
  updated_at: Date;
}

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    owner_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    owner_telegram_id: { type: String, required: true, index: true },
    plan_id: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
    status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
    settings: {
      branding_name: { type: String },
      custom_domain: { type: String },
      webhook_url: { type: String },
      webhook_secret: { type: String },
      support_telegram: { type: String },
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const Workspace = mongoose.model<IWorkspace>('Workspace', WorkspaceSchema);
