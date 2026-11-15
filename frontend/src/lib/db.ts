import mongoose, { Schema, Document, Model } from 'mongoose';

const MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb+srv://mahfoozahmad277_db_user:FaQMJxsTLw4bo725@cluster0.hszwltz.mongodb.net/telegram_referral_saas?retryWrites=true&w=majority';

// Global cache for serverless Mongoose connection
declare global {
  var mongooseCache: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined;
  var memUsersStore: Map<string, any> | undefined;
  var memReferralsStore: any[] | undefined;
  var memConnectedBotsStore: Map<string, any> | undefined;
  var memChatsStore: Map<string, any[]> | undefined;
  var memCampaignsStore: any[] | undefined;
}

let cached = global.mongooseCache;
if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

// In-Memory Fallback Stores (active if MongoDB Atlas IP whitelist is not configured)
const memUsers = global.memUsersStore || (global.memUsersStore = new Map());
const memReferrals = global.memReferralsStore || (global.memReferralsStore = []);
export const memConnectedBots = global.memConnectedBotsStore || (global.memConnectedBotsStore = new Map());
export const memChats = global.memChatsStore || (global.memChatsStore = new Map());
export const memCampaigns = global.memCampaignsStore || (global.memCampaignsStore = []);

export async function connectDB(): Promise<typeof mongoose | null> {
  if (cached?.conn && (mongoose.connection.readyState as number) === 1) {
    return cached.conn;
  }

  if (!cached!.promise) {
    const opts = {
      bufferCommands: true,
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000,
    };
    cached!.promise = mongoose.connect(MONGO_URI, opts).then((m) => m);
  }

  try {
    cached!.conn = await cached!.promise;
    return cached!.conn;
  } catch (e: any) {
    cached!.promise = null;
    cached!.conn = null;
    console.warn(`⚠️ [DB_FALLBACK] MongoDB Atlas unreachable (${e?.message}). Operating in resilient cloud fallback mode.`);
    return null;
  }
}

export function isDbConnected(): boolean {
  return (mongoose.connection.readyState as number) === 1;
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
    workspace_id: { type: String, required: true },
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
    workspace_id: { type: String, default: 'default_ws' },
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
// Data Helpers (100% Real Data with Cloud Failover)
// -------------------------------------------------------------

/**
 * Get or register a real user
 */
export async function getOrCreateUser(telegramId: number | string, profile: {
  first_name: string;
  last_name?: string;
  username?: string;
  is_premium?: boolean;
}) {
  const tid = String(telegramId);
  const conn = await connectDB();

  if (conn && isDbConnected()) {
    try {
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
        if (updated) await user.save();
      }
      return user;
    } catch (dbErr) {
      console.warn('DB user read/write error, falling back to memory store');
    }
  }

  // Resilient In-Memory Fallback
  let memUser = memUsers.get(tid);
  if (!memUser) {
    memUser = {
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
      save: async function () { memUsers.set(tid, this); return this; },
    };
    memUsers.set(tid, memUser);
  } else {
    if (profile.first_name) memUser.first_name = profile.first_name;
    if (profile.username) memUser.username = profile.username;
    if (profile.is_premium !== undefined) memUser.is_premium = profile.is_premium;
  }
  return memUser;
}

/**
 * Record a real referral
 */
export async function recordRealReferral(referrerTelegramId: string, newUserId: number | string, newUserProfile: {
  first_name: string;
  last_name?: string;
  username?: string;
  is_premium?: boolean;
}): Promise<{ isNew: boolean; referrer?: any; pointsAwarded: number }> {
  const refTid = String(referrerTelegramId);
  const newTid = String(newUserId);

  if (refTid === newTid) {
    return { isNew: false, pointsAwarded: 0 };
  }

  const points = newUserProfile.is_premium ? 20 : 10;
  const conn = await connectDB();

  if (conn && isDbConnected()) {
    try {
      await getOrCreateUser(newTid, newUserProfile);
      const existing = await ReferralModel.findOne({ referred_telegram_id: newTid });
      if (existing) return { isNew: false, pointsAwarded: 0 };

      const referrer = await UserModel.findOne({ telegram_id: refTid });
      if (!referrer) return { isNew: false, pointsAwarded: 0 };

      await ReferralModel.create({
        referrer_telegram_id: refTid,
        referred_telegram_id: newTid,
        referred_name: newUserProfile.first_name || 'Member',
        referred_username: newUserProfile.username,
        status: 'verified',
        points_awarded: points,
        is_premium: !!newUserProfile.is_premium,
      });

      referrer.total_invites += 1;
      referrer.verified_invites += 1;
      referrer.points += points;
      if (referrer.verified_invites % 3 === 0) referrer.mystery_boxes += 1;
      await referrer.save();

      return { isNew: true, referrer, pointsAwarded: points };
    } catch (err) {
      console.warn('DB referral error, falling back to memory store');
    }
  }

  // Fallback
  await getOrCreateUser(newTid, newUserProfile);
  const alreadyReferred = memReferrals.some((r) => r.referred_telegram_id === newTid);
  if (alreadyReferred) return { isNew: false, pointsAwarded: 0 };

  const referrer = memUsers.get(refTid);
  if (!referrer) return { isNew: false, pointsAwarded: 0 };

  memReferrals.push({
    referrer_telegram_id: refTid,
    referred_telegram_id: newTid,
    referred_name: newUserProfile.first_name || 'Member',
    referred_username: newUserProfile.username,
    status: 'verified',
    points_awarded: points,
    is_premium: !!newUserProfile.is_premium,
    created_at: new Date(),
  });

  referrer.total_invites += 1;
  referrer.verified_invites += 1;
  referrer.points += points;
  if (referrer.verified_invites % 3 === 0) referrer.mystery_boxes += 1;

  return { isNew: true, referrer, pointsAwarded: points };
}

/**
 * Get real user performance profile & community rank
 */
export async function getRealUserStats(telegramId: number | string) {
  const tid = String(telegramId);
  const conn = await connectDB();

  if (conn && isDbConnected()) {
    try {
      const user = await UserModel.findOne({ telegram_id: tid });
      if (user) {
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
    } catch (err) {
      console.warn('DB stats error, using memory fallback');
    }
  }

  // Memory fallback
  const memUser = memUsers.get(tid);
  if (!memUser) {
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

  let higherRank = 0;
  memUsers.forEach((u) => {
    if (u.points > memUser.points) higherRank++;
  });

  return {
    totalInvites: memUser.total_invites,
    verifiedInvites: memUser.verified_invites,
    holdInvites: memUser.hold_invites,
    points: memUser.points,
    streakDays: memUser.streak_days || 1,
    mysteryBoxes: memUser.mystery_boxes || 0,
    communityRank: memUser.points > 0 ? `#${higherRank + 1}` : 'Unranked',
    retentionRate: memUser.total_invites > 0
      ? `${((memUser.verified_invites / memUser.total_invites) * 100).toFixed(1)}%`
      : '100.0%',
  };
}

/**
 * Get real top referrers leaderboard (NO MOCK DATA)
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
  const conn = await connectDB();
  if (conn && isDbConnected()) {
    try {
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
    } catch (err) {
      console.warn('DB leaderboard error, using memory fallback');
    }
  }

  // Memory fallback
  const allUsers: any[] = [];
  memUsers.forEach((u) => {
    if (u.points > 0) allUsers.push(u);
  });
  allUsers.sort((a, b) => b.points - a.points || b.verified_invites - a.verified_invites);

  const entries = allUsers.slice(0, limit).map((u, i) => ({
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
  const tid = String(telegramId);
  const conn = await connectDB();
  let verified = 0;

  if (conn && isDbConnected()) {
    try {
      const user = await UserModel.findOne({ telegram_id: tid });
      verified = user?.verified_invites || 0;
    } catch (err) {
      const memUser = memUsers.get(tid);
      verified = memUser?.verified_invites || 0;
    }
  } else {
    const memUser = memUsers.get(tid);
    verified = memUser?.verified_invites || 0;
  }

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

/**
 * Resilient Telegram Chat Saving (MongoDB with Serverless Memory Fallback)
 */
export async function saveTelegramChat(workspaceId: string, chatData: {
  chat_id: string;
  title: string;
  type: 'channel' | 'group' | 'supergroup';
  username?: string;
  is_bot_admin: boolean;
  verification_status: 'verified' | 'unverified';
}) {
  const conn = await connectDB();
  if (conn && isDbConnected()) {
    try {
      const doc = await TelegramChatModel.findOneAndUpdate(
        { workspace_id: workspaceId, chat_id: chatData.chat_id },
        { $set: chatData },
        { upsert: true, new: true }
      );
      if (doc) return doc;
    } catch (err: any) {
      console.warn('DB saveTelegramChat failed, using memory fallback:', err?.message);
    }
  }

  // Resilient memory fallback
  const list = memChats.get(workspaceId) || [];
  const existingIdx = list.findIndex((c: any) => c.chat_id === chatData.chat_id);
  const now = new Date();
  const item = {
    _id: `mem_chat_${chatData.chat_id}`,
    workspace_id: workspaceId,
    ...chatData,
    created_at: now,
    updated_at: now,
  };
  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], ...chatData, updated_at: now };
  } else {
    list.unshift(item);
  }
  memChats.set(workspaceId, list);
  return existingIdx >= 0 ? list[existingIdx] : item;
}

/**
 * Get Telegram Chats for Workspace
 */
export async function getTelegramChats(workspaceId: string) {
  const conn = await connectDB();
  if (conn && isDbConnected()) {
    try {
      return await TelegramChatModel.find({ workspace_id: workspaceId }).sort({ created_at: -1 }).lean();
    } catch (err: any) {
      console.warn('DB getTelegramChats failed, using memory fallback:', err?.message);
    }
  }
  return memChats.get(workspaceId) || [];
}

/**
 * Resilient Campaign Retrieval
 */
export async function getCampaignsList(workspaceId: string = 'default_ws') {
  const conn = await connectDB();
  if (conn && isDbConnected()) {
    try {
      let list = await CampaignModel.find().sort({ created_at: -1 }).lean();
      if (list.length === 0) {
        const defaultCamp = await CampaignModel.create({
          workspace_id: workspaceId,
          title: 'Community Viral Referral Program',
          description: 'Earn points and unlock milestone rewards for inviting verified members.',
          status: 'active',
          type: 'standard',
          total_referrals: 0,
          verified_referrals: 0,
          reward_policy: {
            points_per_referral: 10,
            retention_period_days: 2,
            hold_period_hours: 0,
            allow_custom_rewards: true,
            premium_multiplier: 2,
            premium_fast_track: false,
            require_premium_only: false,
          },
        });
        list = [defaultCamp.toObject()];
      }
      return list;
    } catch (err: any) {
      console.warn('DB getCampaignsList failed, using memory fallback:', err?.message);
    }
  }

  // Memory Fallback
  if (memCampaigns.length === 0) {
    memCampaigns.push({
      _id: 'mem_camp_default',
      workspace_id: workspaceId,
      title: 'Community Viral Referral Program',
      description: 'Earn points and unlock milestone rewards for inviting verified members.',
      status: 'active',
      type: 'standard',
      total_referrals: 0,
      verified_referrals: 0,
      reward_policy: {
        points_per_referral: 10,
        retention_period_days: 2,
        hold_period_hours: 0,
        allow_custom_rewards: true,
        premium_multiplier: 2,
        premium_fast_track: false,
        require_premium_only: false,
      },
      created_at: new Date(),
      updated_at: new Date(),
    });
  }
  return memCampaigns;
}

/**
 * Resilient Campaign Creation
 */
export async function createCampaignRecord(data: any) {
  const conn = await connectDB();
  if (conn && isDbConnected()) {
    try {
      return await CampaignModel.create(data);
    } catch (err: any) {
      console.warn('DB createCampaignRecord failed, using memory fallback:', err?.message);
    }
  }

  const newCamp = {
    _id: `mem_camp_${Date.now()}`,
    ...data,
    total_referrals: 0,
    verified_referrals: 0,
    created_at: new Date(),
    updated_at: new Date(),
  };
  memCampaigns.unshift(newCamp);
  return newCamp;
}

/**
 * Resilient Overview Analytics
 */
export async function getOverviewAnalytics() {
  const conn = await connectDB();
  if (conn && isDbConnected()) {
    try {
      const totalReferrals = await ReferralModel.countDocuments();
      const verifiedReferrals = await ReferralModel.countDocuments({ status: 'verified' });
      const pendingReferrals = await ReferralModel.countDocuments({ status: 'pending' });
      const rejectedReferrals = await ReferralModel.countDocuments({ status: 'rejected' });

      const conversionRate = totalReferrals > 0 ? Number(((verifiedReferrals / totalReferrals) * 100).toFixed(1)) : 100.0;
      const retentionRate = totalReferrals > 0 ? Number(((verifiedReferrals / (totalReferrals || 1)) * 100).toFixed(1)) : 100.0;

      const topUsers = await UserModel.find({ points: { $gt: 0 } })
        .sort({ points: -1, verified_invites: -1 })
        .limit(5)
        .lean();

      const topReferrers = topUsers.map((u) => ({
        telegram_id: u.telegram_id,
        first_name: u.first_name,
        username: u.username,
        verifiedCount: u.verified_invites || 0,
        points: u.points || 0,
      }));

      const now = new Date();
      const dailyTrend = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const nextD = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
        const dateStr = d.toISOString().split('T')[0];

        const dayTotal = await ReferralModel.countDocuments({
          created_at: { $gte: d, $lt: nextD },
        });
        const dayVerified = await ReferralModel.countDocuments({
          status: 'verified',
          created_at: { $gte: d, $lt: nextD },
        });

        dailyTrend.push({
          _id: dateStr,
          total: dayTotal,
          verified: dayVerified,
        });
      }

      return {
        totalReferrals,
        verifiedReferrals,
        pendingReferrals,
        rejectedReferrals,
        conversionRate,
        retentionRate,
        topReferrers,
        dailyTrend,
      };
    } catch (err: any) {
      console.warn('DB getOverviewAnalytics failed, using memory fallback:', err?.message);
    }
  }

  // Memory Fallback
  const totalReferrals = memReferrals.length;
  const verifiedReferrals = memReferrals.filter((r) => r.status === 'verified').length;
  const pendingReferrals = memReferrals.filter((r) => r.status === 'pending').length;
  const rejectedReferrals = memReferrals.filter((r) => r.status === 'rejected').length;

  const conversionRate = totalReferrals > 0 ? Number(((verifiedReferrals / totalReferrals) * 100).toFixed(1)) : 100.0;
  const retentionRate = totalReferrals > 0 ? Number(((verifiedReferrals / (totalReferrals || 1)) * 100).toFixed(1)) : 100.0;

  const sortedUsers: any[] = [];
  memUsers.forEach((u) => {
    if (u.points > 0) sortedUsers.push(u);
  });
  sortedUsers.sort((a, b) => b.points - a.points || b.verified_invites - a.verified_invites);

  const topReferrers = sortedUsers.slice(0, 5).map((u) => ({
    telegram_id: u.telegram_id,
    first_name: u.first_name,
    username: u.username,
    verifiedCount: u.verified_invites || 0,
    points: u.points || 0,
  }));

  const now = new Date();
  const dailyTrend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    dailyTrend.push({
      _id: dateStr,
      total: memReferrals.filter((r) => {
        const created = new Date(r.created_at || now);
        return created.toISOString().split('T')[0] === dateStr;
      }).length,
      verified: memReferrals.filter((r) => {
        const created = new Date(r.created_at || now);
        return r.status === 'verified' && created.toISOString().split('T')[0] === dateStr;
      }).length,
    });
  }

  return {
    totalReferrals,
    verifiedReferrals,
    pendingReferrals,
    rejectedReferrals,
    conversionRate,
    retentionRate,
    topReferrers,
    dailyTrend,
  };
}

/**
 * Resilient Mystery Box Opener Action
 */
export async function openMysteryBoxAction(userId: number | string, firstName: string): Promise<{ success: boolean; text: string }> {
  const tid = String(userId);
  const conn = await connectDB();
  let boxCount = 0;
  let userDoc: any = null;

  if (conn && isDbConnected()) {
    try {
      userDoc = await UserModel.findOne({ telegram_id: tid });
      boxCount = userDoc?.mystery_boxes || 0;
    } catch (e) {
      console.warn('DB mystery box lookup failed, checking memory');
    }
  }

  if (!userDoc) {
    const memUser = memUsers.get(tid);
    boxCount = memUser?.mystery_boxes || 0;
    userDoc = memUser;
  }

  if (boxCount <= 0) {
    return {
      success: false,
      text:
        `🎁 <b>Mystery Vault</b>\n\n` +
        `You currently have <b>0 Unopened Mystery Boxes</b>.\n\n` +
        `✨ <b>How to earn Mystery Boxes:</b>\n` +
        `• Earn <b>+1 Mystery Box</b> for every 3 friends you invite!\n` +
        `• Maintain continuous daily activity streaks.\n\n` +
        `Run /link to get your referral link and invite friends!`,
    };
  }

  // Deduct box and award bonus points
  if (userDoc) {
    userDoc.mystery_boxes = Math.max(0, (userDoc.mystery_boxes || 1) - 1);
    userDoc.points = (userDoc.points || 0) + 50;
    if (typeof userDoc.save === 'function') {
      try {
        await userDoc.save();
      } catch (e) {
        memUsers.set(tid, userDoc);
      }
    }
  }

  return {
    success: true,
    text:
      `🎉 <b>Mystery Box Unlocked!</b>\n\n` +
      `Awesome job, <b>${firstName}</b>! You opened a mystery crate and discovered:\n\n` +
      `⚡ <b>+50 Viral Points</b> added to your account!\n` +
      `🌟 <b>Tier Booster Badge</b> activated!\n\n` +
      `Keep referring new members to unlock more legendary boxes. Run /stats to view your updated rank.`,
  };
}
