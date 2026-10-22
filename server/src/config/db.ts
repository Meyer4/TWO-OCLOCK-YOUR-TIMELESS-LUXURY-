import mongoose from 'mongoose';
import { env, isProd } from './env.js';
import { logger } from '../lib/logger.js';

export async function connectDb(): Promise<void> {
  // Strips operator objects from filters (NoSQL injection defence, second layer after Zod validation).
  mongoose.set('sanitizeFilter', true);
  mongoose.set('strictQuery', true);
  mongoose.connection.on('error', (err) => logger.error({ err: err.message }, 'MongoDB connection error'));
  await mongoose.connect(env.MONGODB_URI, {
    autoIndex: !isProd,
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 10000,
  });
  logger.info({ db: mongoose.connection.name }, 'MongoDB connected');
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
