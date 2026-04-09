import { redis } from "../../config/redis.js";

export async function getStorageQuota() {
  const value = await redis.hget('settings', 'storageQuota');
  return parseInt(value ?? process.env.STORAGE_QUOTA);
}