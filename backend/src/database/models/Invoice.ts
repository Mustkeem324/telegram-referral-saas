import mongoose, { Document, Schema } from 'mongoose';

export interface IInvoice extends Document {
  workspace_id: mongoose.Types.ObjectId;
  subscription_id: mongoose.Types.ObjectId;
  payment_id?: mongoose.Types.ObjectId;
  invoice_number: string;
  amount: number;
  currency: string;
  status: 'paid' | 'unpaid' | 'void';
  period_start: Date;
  period_end: Date;
  pdf_url?: string;
  created_at: Date;
  updated_at: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    workspace_id: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    subscription_id: { type: Schema.Types.ObjectId, ref: 'Subscription', required: true },
    payment_id: { type: Schema.Types.ObjectId, ref: 'Payment' },
    invoice_number: { type: String, required: true, unique: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    status: { type: String, enum: ['paid', 'unpaid', 'void'], default: 'paid', index: true },
    period_start: { type: Date, required: true },
    period_end: { type: Date, required: true },
    pdf_url: { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);
