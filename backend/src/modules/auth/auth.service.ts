import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { User, IUser, Workspace, WorkspaceMember, SubscriptionPlan, Subscription } from '../../database/models';
import { validateTelegramInitData, validateTelegramLoginWidget } from '../../utils/crypto';
import { logger } from '../../utils/logger';

export interface AuthTokenPayload {
  userId: string;
  telegramId: string;
  role: 'superadmin' | 'user';
}

export class AuthService {
  /**
   * Issue JWT token
   */
  static generateToken(payload: AuthTokenPayload): string {
    return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
  }

  /**
   * Verify and decode JWT token
   */
  static verifyToken(token: string): AuthTokenPayload | null {
    try {
      return jwt.verify(token, config.jwtSecret) as AuthTokenPayload;
    } catch {
      return null;
    }
  }

  /**
   * Authenticate or register user via Telegram Login Widget
   */
  static async authenticateTelegramWidget(data: Record<string, string>): Promise<{ user: IUser; token: string; workspaceId?: string }> {
    const isValid = validateTelegramLoginWidget(data, config.telegram.botToken);
    if (!isValid && config.env === 'production') {
      throw new Error('Invalid Telegram authentication signature');
    }

    const telegramId = String(data.id);
    let user = await User.findOne({ telegram_id: telegramId });

    if (!user) {
      const isSuper = telegramId === config.superAdmin.telegramId;
      user = await User.create({
        telegram_id: telegramId,
        first_name: data.first_name || 'Creator',
        last_name: data.last_name || '',
        username: data.username,
        photo_url: data.photo_url,
        role: isSuper ? 'superadmin' : 'user',
        is_active: true,
      });

      // Automatically create default workspace for new user
      const freePlan = await SubscriptionPlan.findOne({ code: 'free' });
      if (freePlan) {
        const workspace = await Workspace.create({
          name: `${user.first_name}'s Workspace`,
          slug: `workspace-${user.telegram_id}-${Date.now().toString(36)}`,
          owner_id: user._id,
          owner_telegram_id: user.telegram_id,
          plan_id: freePlan._id,
          status: 'active',
        });

        await WorkspaceMember.create({
          workspace_id: workspace._id,
          user_id: user._id,
          user_telegram_id: user.telegram_id,
          role: 'owner',
          status: 'active',
        });

        // Create default active subscription
        const oneMonthLater = new Date();
        oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

        await Subscription.create({
          workspace_id: workspace._id,
          plan_id: freePlan._id,
          status: 'active',
          current_period_start: new Date(),
          current_period_end: oneMonthLater,
          payment_provider: 'manual',
        });
      }
    } else {
      // Update latest info
      user.first_name = data.first_name || user.first_name;
      user.last_name = data.last_name || user.last_name;
      if (data.username) user.username = data.username;
      if (data.photo_url) user.photo_url = data.photo_url;
      await user.save();
    }

    if (!user.is_active) {
      throw new Error(`Account suspended: ${user.ban_reason || 'Contact support'}`);
    }

    const token = this.generateToken({
      userId: user._id.toString(),
      telegramId: user.telegram_id,
      role: user.role,
    });

    const primaryMember = await WorkspaceMember.findOne({ user_id: user._id, status: 'active' });

    return { user, token, workspaceId: primaryMember?.workspace_id?.toString() };
  }

  /**
   * Authenticate via Telegram Mini App initData
   */
  static async authenticateTelegramWebApp(initData: string): Promise<{ user: IUser; token: string; workspaceId?: string }> {
    const { valid, user: tgUser } = validateTelegramInitData(initData, config.telegram.botToken);
    if (!valid && config.env === 'production') {
      throw new Error('Invalid Telegram Mini App initData signature');
    }

    if (!tgUser || !tgUser.id) {
      throw new Error('Telegram user information missing in initData');
    }

    return this.authenticateTelegramWidget({
      id: String(tgUser.id),
      first_name: tgUser.first_name,
      last_name: tgUser.last_name,
      username: tgUser.username,
      photo_url: tgUser.photo_url,
    });
  }
}
