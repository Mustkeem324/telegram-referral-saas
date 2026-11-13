import mongoose, { Document, Schema } from 'mongoose';

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';

export interface ISubscription extends Document {
  workspace_id: mongoose.Types.ObjectId;
  plan_id: mongoose.Types.ObjectId;
  billing_cycle: 'monthly' | 'yearly';
  status: SubscriptionStatus;
  current_period_start: Date;
  current_period_end: Date;
  cancel_at_period_end: boolean;
  payment_provider: 'telegram_stars' | 'stripe' | 'manual';
  last_payment_id?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    workspace_id: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    plan_id: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true, index: true },
    billing_cycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    status: {
      type: String,
      enum: ['trialing', 'active', 'past_due', 'canceled', 'expired'],
      default: 'active',
      index: true,
    },
    current_period_start: { type: Date, default: Date.now },
    current_period_end: { type: Date, required: true },
    cancel_at_period_end: { type: Boolean, default: false },
    payment_provider: {
      type: String,
      enum: ['telegram_stars', 'stripe', 'manual'],
      default: 'manual',
    },
    last_payment_id: { type: Schema.Types.ObjectId, ref: 'Payment' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

SubscriptionSchema.index({ workspace_id: 1, status: 1 });

export const Subscription = mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
