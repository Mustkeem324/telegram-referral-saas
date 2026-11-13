import mongoose, { Document, Schema } from 'mongoose';

export interface IConnectedBot extends Document {
  workspace_id: mongoose.Types.ObjectId;
  bot_id: string; // Telegram safe string ID
  bot_username: string;
  first_name: string;
  is_primary: boolean; // central bot vs custom creator bot
  token_encrypted?: string; // AES-256-GCM encrypted
  token_iv?: string;
  token_tag?: string;
  webhook_secret: string;
  is_active: boolean;
  health_status: 'healthy' | 'degraded' | 'failing';
  last_health_check_at?: Date;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

const ConnectedBotSchema = new Schema<IConnectedBot>(
  {
    workspace_id: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    bot_id: { type: String, required: true, index: true },
    bot_username: { type: String, required: true },
    first_name: { type: String, required: true },
    is_primary: { type: Boolean, default: false },
    token_encrypted: { type: String },
    token_iv: { type: String },
    token_tag: { type: String },
    webhook_secret: { type: String, required: true },
    is_active: { type: Boolean, default: true, index: true },
    health_status: { type: String, enum: ['healthy', 'degraded', 'failing'], default: 'healthy' },
    last_health_check_at: { type: Date },
    error_message: { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

ConnectedBotSchema.index({ workspace_id: 1, bot_id: 1 }, { unique: true });

export const ConnectedBot = mongoose.model<IConnectedBot>('ConnectedBot', ConnectedBotSchema);
