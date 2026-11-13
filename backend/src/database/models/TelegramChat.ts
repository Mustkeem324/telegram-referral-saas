import mongoose, { Document, Schema } from 'mongoose';

export interface ITelegramChat extends Document {
  workspace_id: mongoose.Types.ObjectId;
  chat_id: string; // Stored safely as String
  title: string;
  type: 'channel' | 'group' | 'supergroup';
  username?: string;
  invite_link?: string;
  is_bot_admin: boolean;
  permissions: {
    can_invite_users: boolean;
    can_manage_chat?: boolean;
    can_post_messages?: boolean;
    can_delete_messages?: boolean;
    can_restrict_members?: boolean;
  };
  verification_status: 'verified' | 'unverified' | 'permissions_missing';
  connected_by: mongoose.Types.ObjectId;
  last_verified_at: Date;
  created_at: Date;
  updated_at: Date;
}

const TelegramChatSchema = new Schema<ITelegramChat>(
  {
    workspace_id: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    chat_id: { type: String, required: true, index: true },
    title: { type: String, required: true },
    type: { type: String, enum: ['channel', 'group', 'supergroup'], required: true },
    username: { type: String },
    invite_link: { type: String },
    is_bot_admin: { type: Boolean, default: false },
    permissions: {
      can_invite_users: { type: Boolean, default: false },
      can_manage_chat: { type: Boolean, default: false },
      can_post_messages: { type: Boolean, default: false },
      can_delete_messages: { type: Boolean, default: false },
      can_restrict_members: { type: Boolean, default: false },
    },
    verification_status: {
      type: String,
      enum: ['verified', 'unverified', 'permissions_missing'],
      default: 'unverified',
      index: true,
    },
    connected_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    last_verified_at: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

TelegramChatSchema.index({ workspace_id: 1, chat_id: 1 }, { unique: true });

export const TelegramChat = mongoose.model<ITelegramChat>('TelegramChat', TelegramChatSchema);
