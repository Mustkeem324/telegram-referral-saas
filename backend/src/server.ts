import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { Server as SocketIOServer } from 'socket.io';

import { config } from './config';
import { logger } from './utils/logger';
import { connectDatabase, disconnectDatabase } from './database/connection';
import { seedInitialData } from './database/seeds';

// Routers
import { authRouter } from './modules/auth/auth.routes';
import { workspaceRouter } from './modules/workspaces/workspace.routes';
import { campaignRouter } from './modules/campaigns/campaign.routes';
import { referralRouter } from './modules/referrals/referral.routes';
import { rewardRouter } from './modules/rewards/reward.routes';
import { giveawayRouter } from './modules/giveaways/giveaway.routes';
import { subscriptionRouter } from './modules/subscriptions/subscription.routes';
import { antifraudRouter } from './modules/antifraud/antifraud.routes';
import { analyticsRouter } from './modules/analytics/analytics.routes';
import { adminRouter } from './modules/admin/admin.routes';
import { webhookRouter } from './modules/telegram/webhook.routes';

const app = express();
const server = http.createServer(app);

// Socket.IO for real-time dashboard updates
export const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on('join_workspace', (workspaceId: string) => {
    socket.join(`ws_${workspaceId}`);
    logger.info(`Socket ${socket.id} joined room ws_${workspaceId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (config.env !== 'test') {
  app.use(morgan('combined'));
}

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { error: 'Too many requests from this IP, please try again later.' },
});
app.use('/api/', apiLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: config.env,
  });
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/workspaces', workspaceRouter);
app.use('/api/campaigns', campaignRouter);
app.use('/api/referrals', referralRouter);
app.use('/api/rewards', rewardRouter);
app.use('/api/giveaways', giveawayRouter);
app.use('/api/subscriptions', subscriptionRouter);
app.use('/api/antifraud', antifraudRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/webhook', webhookRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled Application Error:', { error: err.message, stack: err.stack });
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Start Server function
export async function startServer() {
  await connectDatabase();
  await seedInitialData();

  return new Promise<http.Server>((resolve) => {
    server.listen(config.port, () => {
      logger.info(`🚀 Telegram Referral SaaS Server running on http://localhost:${config.port}`);
      resolve(server);
    });
  });
}

// Run automatically if executed directly
if (require.main === module) {
  startServer().catch((err) => {
    logger.error('Failed to start server:', err);
    process.exit(1);
  });
}

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down server...');
  server.close(async () => {
    await disconnectDatabase();
    logger.info('Server gracefully terminated.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { app, server };
