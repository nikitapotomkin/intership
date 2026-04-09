import { z } from 'zod';

export const initUploadSchema = z.object({
  fileName: z.string().min(1),
  fileSize: z.number().positive(),
  totalChunks: z.number().int().positive(),
});

export const completeSchema = z.object({
  id: z.uuid('v4'),
});

export const chunkSchema = z.object({
  id: z.uuid('v4'),
  chunkIndex: z.coerce.number().int().min(0),
});