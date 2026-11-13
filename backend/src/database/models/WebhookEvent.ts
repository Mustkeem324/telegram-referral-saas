import mongoose, { Document, Schema } from 'mongoose';

export interface IWebhookEvent extends Document {
  provider: 'telegram' | 'stripe' | 'custom';
  event_id: string; // Idempotency key (e.g. Telegram update_id)
  payload_type: string;
  raw_payload: Record<string, any>;
  processed: boolean;
  processing_error?: string;
  received_at: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>(
  {
    provider: { type: String, enum: ['telegram', 'stripe', 'custom'], required: true },
    event_id: { type: String, required: true, index: true },
    payload_type: { type: String, required: true },
    raw_payload: { type: Schema.Types.Mixed, required: true },
    processed: { type: Boolean, default: false, index: true },
    processing_error: { type: String },
    received_at: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: 'received_at', updatedAt: false } }
);

WebhookEventSchema.index({ provider: 1, event_id: 1 }, { unique: true });

export const WebhookEvent = mongoose.model<IWebhookEvent>('WebhookEvent', WebhookEventSchema);
