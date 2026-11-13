import mongoose, { Document, Schema } from 'mongoose';

export interface ISupportMessage {
  sender_id?: mongoose.Types.ObjectId;
  sender_telegram_id: string;
  sender_role: 'user' | 'support' | 'admin';
  message: string;
  timestamp: Date;
}

export interface ISupportTicket extends Document {
  workspace_id?: mongoose.Types.ObjectId;
  user_id?: mongoose.Types.ObjectId;
  user_telegram_id: string;
  subject: string;
  category: 'general' | 'payment' | 'campaign' | 'technical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  messages: ISupportMessage[];
  created_at: Date;
  updated_at: Date;
}

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    workspace_id: { type: Schema.Types.ObjectId, ref: 'Workspace', index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User' },
    user_telegram_id: { type: String, required: true, index: true },
    subject: { type: String, required: true },
    category: {
      type: String,
      enum: ['general', 'payment', 'campaign', 'technical'],
      default: 'general',
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    messages: [
      {
        sender_id: { type: Schema.Types.ObjectId, ref: 'User' },
        sender_telegram_id: { type: String, required: true },
        sender_role: { type: String, enum: ['user', 'support', 'admin'], default: 'user' },
        message: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

SupportTicketSchema.index({ user_telegram_id: 1, status: 1 });

export const SupportTicket = mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);
