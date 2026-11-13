import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  workspace_id?: mongoose.Types.ObjectId;
  actor_id?: mongoose.Types.ObjectId;
  actor_telegram_id?: string;
  actor_type: 'user' | 'admin' | 'bot' | 'system';
  action: string;
  resource_type: string;
  resource_id?: string;
  diff?: Record<string, any>;
  ip_address?: string;
  created_at: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    workspace_id: { type: Schema.Types.ObjectId, ref: 'Workspace', index: true },
    actor_id: { type: Schema.Types.ObjectId, ref: 'User' },
    actor_telegram_id: { type: String, index: true },
    actor_type: { type: String, enum: ['user', 'admin', 'bot', 'system'], default: 'user' },
    action: { type: String, required: true, index: true },
    resource_type: { type: String, required: true, index: true },
    resource_id: { type: String },
    diff: { type: Schema.Types.Mixed },
    ip_address: { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

AuditLogSchema.index({ workspace_id: 1, created_at: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
