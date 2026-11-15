import mongoose, { Schema, Document, Model } from 'mongoose';

const MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb+srv://mahfoozahmad277_db_user:FaQMJxsTLw4bo725@cluster0.hszwltz.mongodb.net/telegram_referral_saas?retryWrites=true&w=majority';

// Global cache for serverless Mongoose connection
declare global {
  var mongooseCache: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined;
}

let cached = global.mongooseCache;
if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    };
    cached!.promise = mongoose.connect(MONGO_URI, opts).then((m) => m);
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}

// -------------------------------------------------------------
// Models
// -------------------------------------------------------------

// 1. User Model
export interface IUserDoc extends Document {
  telegram_id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  is_premium: boolean;
  points: number;
  total_invites: number;
  verified_invites: number;
  hold_invites: number;
  streak_days: number;
  mystery_boxes: number;
  referred_by_telegram_id?: string;
  created_at: Date;
  updated_at: Date;
}

const UserSchema = new Schema<IUserDoc>(
  {
    telegram_id: { type: String, required: true, unique: true, index: true },
    first_name: { type: String, required: true },
    last_name: { type: String },
    username: { type: String },
    is_premium: { type: Boolean, default: false },
    points: { type: Number, default: 0 },
    total_invites: { type: Number, default: 0 },
    verified_invites: { type: Number, default: 0 },
    hold_invites: { type: Number, default: 0 },
    streak_days: { type: Number, default: 1 },
    mystery_boxes: { type: Number, default: 0 },
    referred_by_telegram_id: { type: String, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const UserModel: Model<IUserDoc> =
  mongoose.models.User || mongoose.model<IUserDoc>('User', UserSchema);

// 2. Referral Model
export interface IReferralDoc extends Document {
  referrer_telegram_id: string;
  referred_telegram_id: string;
  referred_name: string;
  referred_username?: string;
  status: 'pending' | 'verified' | 'rejected';
  points_awarded: number;
  is_premium: boolean;
  created_at: Date;
}

const ReferralSchema = new Schema<IReferralDoc>(
  {
    referrer_telegram_id: { type: String, required: true, index: true },
    referred_telegram_id: { type: String, required: true, index: true },
    referred_name: { type: String, default: 'Member' },
    referred_username: { type: String },
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'verified' },
    points_awarded: { type: Number, default: 10 },
    is_premium: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export const ReferralModel: Model<IReferralDoc> =
  mongoose.models.Referral || mongoose.model<IReferralDoc>('Referral', ReferralSchema);

// 3. Connected Bot Model (Custom Bot)
export interface IConnectedBotDoc extends Document {
  workspace_id: string;
  bot_id: string;
  bot_username: string;
  first_name: string;
  token?: string;
  is_active: boolean;
  health_status: 'healthy' | 'stopped' | 'error';
  last_ping_ms?: number;
  last_health_check_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const ConnectedBotSchema = new Schema<IConnectedBotDoc>(
  {
    workspace_id: { type: String, required: true },
    bot_id: { type: String, required: true },
    bot_username: { type: String, required: true },
    first_name: { type: String, required: true },
    token: { type: String },
    is_active: { type: Boolean, default: true },
    health_status: { type: String, enum: ['healthy', 'stopped', 'error'], default: 'healthy' },
    last_ping_ms: { type: Number },
    last_health_check_at: { type: Date },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

ConnectedBotSchema.index({ workspace_id: 1 }, { unique: true });

export const ConnectedBotModel: Model<IConnectedBotDoc> =
  mongoose.models.ConnectedBot || mongoose.model<IConnectedBotDoc>('ConnectedBot', ConnectedBotSchema);

// 4. Telegram Chat (Channels / Groups)
export interface ITelegramChatDoc extends Document {
  workspace_id: string;
  chat_id: string;
  title: string;
  type: 'channel' | 'group' | 'supergroup';
  username?: string;
  is_bot_admin: boolean;
  verification_status: 'verified' | 'unverified';
  created_at: Date;
  updated_at: Date;
}

const TelegramChatSchema = new Schema<ITelegramChatDoc>(
  {
    workspace_id: { type: String, required: true, index: true },
    chat_id: { type: String, required: true },
    title: { type: String, required: true },
    type: { type: String, enum: ['channel', 'group', 'supergroup'], default: 'group' },
    username: { type: String },
    is_bot_admin: { type: Boolean, default: false },
    verification_status: { type: String, enum: ['verified', 'unverified'], default: 'verified' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

TelegramChatSchema.index({ workspace_id: 1, chat_id: 1 }, { unique: true });

export const TelegramChatModel: Model<ITelegramChatDoc> =
  mongoose.models.TelegramChat || mongoose.model<ITelegramChatDoc>('TelegramChat', TelegramChatSchema);

// 5. Campaign Model
export interface ICampaignDoc extends Document {
  workspace_id: string;
  title: string;
  description?: string;
  status: 'active' | 'paused' | 'completed';
  type: string;
  reward_policy: {
    points_per_referral: number;
    retention_period_days: number;
    hold_period_hours: number;
    allow_custom_rewards: boolean;
    premium_multiplier: number;
    premium_fast_track: boolean;
    require_premium_only: boolean;
  };
  total_referrals: number;
  verified_referrals: number;
  created_at: Date;
  updated_at: Date;
}

const CampaignSchema = new Schema<ICampaignDoc>(
  {
    workspace_id: { type: String, default: 'default_ws', index: true },
    title: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ['active', 'paused', 'completed'], default: 'active' },
    type: { type: String, default: 'standard' },
    reward_policy: {
      points_per_referral: { type: Number, default: 10 },
      retention_period_days: { type: Number, default: 2 },
      hold_period_hours: { type: Number, default: 0 },
      allow_custom_rewards: { type: Boolean, default: true },
      premium_multiplier: { type: Number, default: 2 },
      premium_fast_track: { type: Boolean, default: false },
      require_premium_only: { type: Boolean, default: false },
    },
    total_referrals: { type: Number, default: 0 },
    verified_referrals: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const CampaignModel: Model<ICampaignDoc> =
  mongoose.models.Campaign || mongoose.model<ICampaignDoc>('Campaign', CampaignSchema);

// -------------------------------------------------------------
// Data Helpers (100% Real Data)
// -------------------------------------------------------------

/**
 * Get or register a real user in MongoDB
 */
export async function getOrCreateUser(telegramId: number | string, profile: {
  first_name: string;
  last_name?: string;
  username?: string;
  is_premium?: boolean;
}) {
  await connectDB();
  const tid = String(telegramId);
  let user = await UserModel.findOne({ telegram_id: tid });

  if (!user) {
    user = await UserModel.create({
      telegram_id: tid,
      first_name: profile.first_name,
      last_name: profile.last_name,
      username: profile.username,
      is_premium: !!profile.is_premium,
      points: 0,
      total_invites: 0,
      verified_invites: 0,
      hold_invites: 0,
      streak_days: 1,
      mystery_boxes: 0,
    });
  } else {
    // Update profile if changed
    let updated = false;
    if (profile.first_name && user.first_name !== profile.first_name) {
      user.first_name = profile.first_name;
      updated = true;
    }
    if (profile.username && user.username !== profile.username) {
      user.username = profile.username;
      updated = true;
    }
    if (profile.is_premium !== undefined && user.is_premium !== profile.is_premium) {
      user.is_premium = profile.is_premium;
      updated = true;
    }
    if (updated) {
      await user.save();
    }
  }

  return user;
}

/**
 * Record a real referral when someone joins via a referral link
 */
export async function recordRealReferral(referrerTelegramId: string, newUserId: number | string, newUserProfile: {
  first_name: string;
  last_name?: string;
  username?: string;
  is_premium?: boolean;
}): Promise<{ isNew: boolean; referrer?: IUserDoc; pointsAwarded: number }> {
  await connectDB();
  const refTid = String(referrerTelegramId);
  const newTid = String(newUserId);

  // Prevent self-referral
  if (refTid === newTid) {
    return { isNew: false, pointsAwarded: 0 };
  }

  // Ensure new user exists
  const newUser = await getOrCreateUser(newTid, newUserProfile);

  // Check if this newcomer was already referred
  const existingReferral = await ReferralModel.findOne({ referred_telegram_id: newTid });
  if (existingReferral) {
    return { isNew: false, pointsAwarded: 0 };
  }

  // Find referrer
  const referrer = await UserModel.findOne({ telegram_id: refTid });
  if (!referrer) {
    return { isNew: false, pointsAwarded: 0 };
  }

  // Points calculation: 10 base, 20 if newcomer has Telegram Premium
  const points = newUserProfile.is_premium ? 20 : 10;

  // Create real referral document
  await ReferralModel.create({
    referrer_telegram_id: refTid,
    referred_telegram_id: newTid,
    referred_name: newUserProfile.first_name || 'Member',
    referred_username: newUserProfile.username,
    status: 'verified',
    points_awarded: points,
    is_premium: !!newUserProfile.is_premium,
  });

  // Update referrer stats in MongoDB
  referrer.total_invites += 1;
  referrer.verified_invites += 1;
  referrer.points += points;

  // Award mystery box every 3 referrals
  if (referrer.verified_invites % 3 === 0) {
    referrer.mystery_boxes += 1;
  }

  await referrer.save();

  // Link new user
  newUser.referred_by_telegram_id = refTid;
  await newUser.save();

  return { isNew: true, referrer, pointsAwarded: points };
}

/**
 * Get real user performance profile & community rank
 */
export async function getRealUserStats(telegramId: number | string) {
  await connectDB();
  const tid = String(telegramId);
  const user = await UserModel.findOne({ telegram_id: tid });

  if (!user) {
    return {
      totalInvites: 0,
      verifiedInvites: 0,
      holdInvites: 0,
      points: 0,
      streakDays: 1,
      mysteryBoxes: 0,
      communityRank: 'Unranked',
      retentionRate: '0.0%',
    };
  }

  // Calculate real community rank based on verified points
  const higherCount = await UserModel.countDocuments({ points: { $gt: user.points } });
  const communityRank = user.points > 0 ? `#${higherCount + 1}` : 'Unranked';

  const retentionRate =
    user.total_invites > 0
      ? `${((user.verified_invites / user.total_invites) * 100).toFixed(1)}%`
      : '100.0%';

  return {
    totalInvites: user.total_invites,
    verifiedInvites: user.verified_invites,
    holdInvites: user.hold_invites,
    points: user.points,
    streakDays: user.streak_days || 1,
    mysteryBoxes: user.mystery_boxes || 0,
    communityRank,
    retentionRate,
  };
}

/**
 * Get real top referrers leaderboard from MongoDB (NO MOCK DATA)
 */
export async function getRealLeaderboard(limit = 10): Promise<{
  entries: Array<{
    rank: number;
    name: string;
    username?: string;
    invites: number;
    points: number;
    isPremium: boolean;
  }>;
}> {
  await connectDB();
  const topUsers = await UserModel.find({ points: { $gt: 0 } })
    .sort({ points: -1, verified_invites: -1 })
    .limit(limit)
    .lean();

  const entries = topUsers.map((u, i) => ({
    rank: i + 1,
    name: u.first_name,
    username: u.username,
    invites: u.verified_invites || 0,
    points: u.points || 0,
    isPremium: !!u.is_premium,
  }));

  return { entries };
}

/**
 * Get real milestone tiers progress
 */
export async function getRealMilestoneProgress(telegramId: number | string) {
  await connectDB();
  const tid = String(telegramId);
  const user = await UserModel.findOne({ telegram_id: tid });
  const verified = user?.verified_invites || 0;

  return {
    verifiedCount: verified,
    tier1: {
      target: 5,
      completed: verified >= 5,
      remaining: Math.max(0, 5 - verified),
    },
    tier2: {
      target: 15,
      completed: verified >= 15,
      remaining: Math.max(0, 15 - verified),
    },
    tier3: {
      target: 50,
      completed: verified >= 50,
      remaining: Math.max(0, 50 - verified),
    },
  };
}
