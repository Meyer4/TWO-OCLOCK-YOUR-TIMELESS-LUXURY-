import { createHash } from 'node:crypto';
import { env } from '../config/env.js';
import { serviceUnavailable } from './errors.js';

/**
 * Creates a signed upload payload so the browser can upload directly to Cloudinary.
 * The API secret never leaves the server.
 */
export function createUploadSignature(folder: string): {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
} {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw serviceUnavailable('Image uploads are not configured yet');
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `folder=${folder}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`;
  const signature = createHash('sha1').update(toSign).digest('hex');
  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    timestamp,
    folder,
    signature,
  };
}
