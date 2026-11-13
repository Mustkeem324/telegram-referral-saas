import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/telegram_referral_saas',
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  jwtSecret: process.env.JWT_SECRET || 'super-secret-jwt-key-referral-saas-production-grade-256',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  encryptionKey: process.env.ENCRYPTION_KEY || 'e9b3e1572c8423f04495c61285cb1f1c247ea7981cfda8391763e02d847a9ef8', // 32 bytes hex
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '7891234567:AAFakeTokenForLocalTestingOnlySecureMockToken',
    botUsername: process.env.TELEGRAM_BOT_USERNAME || 'tg_ref_saas_bot',
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL || '',
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || 'wh_secret_referral_saas_2026',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  superAdmin: {
    telegramId: process.env.SUPERADMIN_TELEGRAM_ID || '123456789',
    secretKey: process.env.SUPERADMIN_SECRET_KEY || 'admin_secret_key_tg_saas_2026',
  },
};
