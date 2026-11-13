import mongoose, { Document, Schema } from 'mongoose';

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface IPayment extends Document {
  workspace_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  provider: 'telegram_stars' | 'stripe' | 'manual';
  plan_id: mongoose.Types.ObjectId;
  amount: number;
  currency: string; // 'XTR' for Telegram Stars, 'USD', etc.
  external_payment_id?: string;
  telegram_payment_charge_id?: string;
  status: PaymentStatus;
  idempotency_key: string;
  payload_hash: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    workspace_id: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, enum: ['telegram_stars', 'stripe', 'manual'], required: true },
    plan_id: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    external_payment_id: { type: String, index: true },
    telegram_payment_charge_id: { type: String, index: true },
    status: {
      type: String,
      enum: ['pending', 'succeeded', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    idempotency_key: { type: String, required: true, unique: true, index: true },
    payload_hash: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
