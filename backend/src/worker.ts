import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { config } from './config';
import { logger } from './utils/logger';
import { connectDatabase } from './database/connection';
import { VerificationService } from './modules/verification/verification.service';
import { Campaign } from './database/models';

const redisConnection = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null,
});

export const AUDIT_QUEUE_NAME = 'retention_audit_queue';
export const auditQueue = new Queue(AUDIT_QUEUE_NAME, { connection: redisConnection });

async function initWorker() {
  await connectDatabase();
  logger.info('Worker connected to MongoDB');

  const worker = new Worker(
    AUDIT_QUEUE_NAME,
    async (job: Job) => {
      logger.info(`Processing job ${job.id} (${job.name})`);

      if (job.name === 'run_daily_retention_audit') {
        const activeCampaigns = await Campaign.find({ status: 'active' });
        logger.info(`Running retention audit for ${activeCampaigns.length} active campaigns`);

        for (const camp of activeCampaigns) {
          const res = await VerificationService.runRetentionVerificationAudit(camp._id.toString());
          logger.info(`Audit completed for ${camp.title}: checked ${res.checkedCount}, reversed ${res.reversedCount}`);
        }
      }
    },
    { connection: redisConnection }
  );

  worker.on('completed', (job) => {
    logger.info(`Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed with error: ${err.message}`);
  });

  logger.info('🚀 Background Queue Worker started and listening for jobs');
}

if (require.main === module) {
  initWorker().catch((err) => {
    logger.error('Worker failed to start:', err);
    process.exit(1);
  });
}
