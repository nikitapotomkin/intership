import { redis } from '../config/redis.js';

const SETTINGS_KEY = 'settings';

export class AdminService {
  async getSettings() {
    const settings = await redis.hgetall(SETTINGS_KEY);

    return {
      storageQuota: parseInt(settings?.storageQuota ?? process.env.STORAGE_QUOTA),
      chunkSize: parseInt(settings?.chunkSize ?? process.env.CHUNK_SIZE),
    };
  }

  async updateSettings({ storageQuota, chunkSize }) {
    if (storageQuota !== undefined) await redis.hset(SETTINGS_KEY, 'storageQuota', storageQuota);
    if (chunkSize !== undefined) await redis.hset(SETTINGS_KEY, 'chunkSize', chunkSize);
    return this.getSettings();
  }
}
