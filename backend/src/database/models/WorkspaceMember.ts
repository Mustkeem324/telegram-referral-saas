import mongoose, { Document, Schema } from 'mongoose';

export type WorkspaceRole = 'owner' | 'admin' | 'manager' | 'viewer';

export interface IWorkspaceMember extends Document {
  workspace_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  user_telegram_id: string;
  role: WorkspaceRole;
  invited_by?: mongoose.Types.ObjectId;
  status: 'active' | 'pending' | 'revoked';
  created_at: Date;
  updated_at: Date;
}

const WorkspaceMemberSchema = new Schema<IWorkspaceMember>(
  {
    workspace_id: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    user_telegram_id: { type: String, required: true, index: true },
    role: { type: String, enum: ['owner', 'admin', 'manager', 'viewer'], required: true },
    invited_by: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['active', 'pending', 'revoked'], default: 'active', index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Compound index for tenant uniqueness
WorkspaceMemberSchema.index({ workspace_id: 1, user_id: 1 }, { unique: true });
WorkspaceMemberSchema.index({ workspace_id: 1, user_telegram_id: 1 });

export const WorkspaceMember = mongoose.model<IWorkspaceMember>('WorkspaceMember', WorkspaceMemberSchema);
