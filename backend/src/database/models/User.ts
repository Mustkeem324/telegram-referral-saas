import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  telegram_id: string; // Stored safely as String
  username?: string;
  first_name: string;
  last_name?: string;
  photo_url?: string;
  role: 'superadmin' | 'user';
  is_active: boolean;
  banned_at?: Date;
  ban_reason?: string;
  created_at: Date;
  updated_at: Date;
}

const UserSchema = new Schema<IUser>(
  {
    telegram_id: { type: String, required: true, unique: true, index: true },
    username: { type: String, index: true },
    first_name: { type: String, required: true },
    last_name: { type: String },
    photo_url: { type: String },
    role: { type: String, enum: ['superadmin', 'user'], default: 'user', index: true },
    is_active: { type: Boolean, default: true, index: true },
    banned_at: { type: Date },
    ban_reason: { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const User = mongoose.model<IUser>('User', UserSchema);
