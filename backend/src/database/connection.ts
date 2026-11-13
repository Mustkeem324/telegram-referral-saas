import mongoose from 'mongoose';
import { config } from '../config';
import { logger } from '../utils/logger';

export async function connectDatabase(): Promise<typeof mongoose> {
  try {
    mongoose.set('strictQuery', true);
    const conn = await mongoose.connect(config.mongoUri, {
      autoIndex: true,
      maxPoolSize: 50,
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`MongoDB connected successfully to ${config.mongoUri}`);
    return conn;
  } catch (err: any) {
    logger.error('Failed to connect to MongoDB', { error: err.message });
    throw err;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}
