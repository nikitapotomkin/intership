import { z } from 'zod';

const MB = 1024 * 1024;

export const updateSettingsSchema = z.object({
  storageQuota: z.number().min(1 * MB).max(100 * 1024 * MB).optional(),
  chunkSize: z.number().min(64 * 1024).max(100 * MB).optional(),
}).refine(
  (data) => data.storageQuota !== undefined || data.chunkSize !== undefined,
  { message: 'At least one field must be provided' }
);