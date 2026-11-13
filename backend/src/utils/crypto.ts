import crypto from 'crypto';
import { config } from '../config';

const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt sensitive bot tokens using AES-256-GCM
 */
export function encryptToken(token: string): { encrypted: string; iv: string; tag: string } {
  const key = Buffer.from(config.encryptionKey, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return {
    encrypted,
    iv: iv.toString('hex'),
    tag,
  };
}

/**
 * Decrypt sensitive bot tokens using AES-256-GCM
 */
export function decryptToken(encrypted: string, iv: string, tag: string): string {
  const key = Buffer.from(config.encryptionKey, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Validate Telegram WebApp initData using bot token HMAC
 */
export function validateTelegramInitData(initData: string, botToken: string): { valid: boolean; user?: any } {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) return { valid: false };

    urlParams.delete('hash');

    const params: string[] = [];
    urlParams.forEach((val, key) => {
      params.push(`${key}=${val}`);
    });
    params.sort();
    const dataCheckString = params.join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (calculatedHash === hash) {
      const userStr = urlParams.get('user');
      const user = userStr ? JSON.parse(userStr) : undefined;
      return { valid: true, user };
    }
    return { valid: false };
  } catch (err) {
    return { valid: false };
  }
}

/**
 * Validate Telegram Login Widget auth data
 */
export function validateTelegramLoginWidget(data: Record<string, string>, botToken: string): boolean {
  try {
    const { hash, ...rest } = data;
    if (!hash) return false;

    const checkString = Object.keys(rest)
      .sort()
      .map((k) => `${k}=${rest[k]}`)
      .join('\n');

    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

    return calculatedHash === hash;
  } catch {
    return false;
  }
}
