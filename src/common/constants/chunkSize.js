import { redis } from "../../config/redis.js";

export async function getChunkSize() {
  const value = await redis.hget('settings', 'chunkSize');
  return parseInt(value ?? process.env.CHUNK_SIZE);
}