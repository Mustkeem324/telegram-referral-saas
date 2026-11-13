import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  workspace_id?: mongoose.Types.ObjectId;
  user_telegram_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  is_read: boolean;
  channel: 'in_app' | 'telegram' | 'both';
  created_at: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    workspace_id: { type: Schema.Types.ObjectId, ref: 'Workspace', index: true },
    user_telegram_id: { type: String, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['info', 'success', 'warning', 'alert'], default: 'info' },
    is_read: { type: Boolean, default: false, index: true },
    channel: { type: String, enum: ['in_app', 'telegram', 'both'], default: 'in_app' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

NotificationSchema.index({ user_telegram_id: 1, is_read: 1, created_at: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
