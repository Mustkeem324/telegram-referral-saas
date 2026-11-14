import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  telegram_id: string; // Stored safely as String
  username?: string;
  first_name: string;
  last_name?: string;
  photo_url?: string;
  role: 'superadmin' | 'user';
  is_premium: boolean;
  is_active: boolean;
  banned_at?: Date;
  ban_reason?: string;
  referred_by_telegram_id?: string;
  referred_by_code?: string;
  referred_campaign_id?: mongoose.Types.ObjectId;
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
    is_premium: { type: Boolean, default: false, index: true },
    is_active: { type: Boolean, default: true, index: true },
    banned_at: { type: Date },
    ban_reason: { type: String },
    referred_by_telegram_id: { type: String, index: true },
    referred_by_code: { type: String },
    referred_campaign_id: { type: Schema.Types.ObjectId, ref: 'Campaign' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const User = mongoose.model<IUser>('User', UserSchema);
