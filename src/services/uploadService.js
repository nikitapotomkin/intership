import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { redis } from "../config/redis.js";
import { QuotaError } from "../common/exceptions/quotaError.js";
import { NotFoundError } from "../common/exceptions/notFoundError.js";
import { AlreadyCompletedError } from "../common/exceptions/alreadyCompletedError.js";
import { STORAGE_DIR } from "../common/constants/storageDir.js";
import { getStorageQuota } from "../common/constants/storageQuota.js";
import { ValidationError } from "../common/exceptions/validationError.js";

const SESSION_TTL = 60 * 60 * 24;

const sessionKey = (uploadId) => `upload:${uploadId}`;
const chunkKey = (uploadId, i) => `upload:${uploadId}:chunk:${i}`;

export class UploadService {
  async initUpload({ fileName, fileSize, totalChunks }) {
    const cleanedName = this.safeName(fileName);

    const used = await this.getStorageUsed();
    const storageQuota = await getStorageQuota();
    if (used + fileSize > storageQuota) throw new QuotaError(used, fileSize);

    const uploadId = randomUUID();

    await redis.hmset(sessionKey(uploadId), {
      fileName: cleanedName,
      fileSize,
      totalChunks,
      receivedChunks: 0,
      status: "in_progress",
    });
    await redis.expire(sessionKey(uploadId), SESSION_TTL);

    return { uploadId };
  }

  async saveChunk(uploadId, chunkIndex, chunkData) {
    if (!Buffer.isBuffer(chunkData) || chunkData.length === 0) {
      throw new ValidationError("Invalid chunk");
    }

    const session = await this.#getSession(uploadId);
    if (session.status === "completed") throw new AlreadyCompletedError();

    await redis.setex(chunkKey(uploadId, chunkIndex), SESSION_TTL, chunkData);
    const receivedChunks = await redis.hincrby(
      sessionKey(uploadId),
      "receivedChunks",
      1,
    );

    return { receivedChunks, totalChunks: parseInt(session.totalChunks) };
  }

  safeName(name) {
    return name
      .replace(/[^a-zA-Z0-9._\-а-яА-ЯіІїЇєЄ\u0400-\u04FF]/gu, "_")
      .replace(/\.\.+/g, ".");
  }

  async completeUpload(uploadId) {
    const session = await this.#getSession(uploadId);
    const totalChunks = parseInt(session.totalChunks);
    const ext = path.extname(session.fileName);
    const base = path.basename(session.fileName, ext);
    const uniqueFileName = `${base}-${uploadId}${ext}`;

    const filePath = path.join(STORAGE_DIR, uniqueFileName);
    const writeStream = fs.createWriteStream(filePath);

    for (let i = 0; i < totalChunks; i++) {
      const chunk = await redis.getBuffer(chunkKey(uploadId, i));
      if (!chunk) throw new NotFoundError(`Missing chunk ${i}`);
      writeStream.write(chunk);
    }

    await new Promise((resolve, reject) => {
      writeStream.end();
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    await redis.hset(sessionKey(uploadId), "status", "completed");

    const chunkKeys = Array.from({ length: totalChunks }, (_, i) =>
      chunkKey(uploadId, i),
    );
    await redis.del(...chunkKeys);

    return { fileName: session.fileName, size: parseInt(session.fileSize) };
  }

  async getStatus(uploadId) {
    const session = await this.#getSession(uploadId);
    return {
      status: session.status,
      receivedChunks: parseInt(session.receivedChunks),
      totalChunks: parseInt(session.totalChunks),
    };
  }

  async getStorageUsed() {
    if (!fs.existsSync(STORAGE_DIR)) return 0;
    return fs.readdirSync(STORAGE_DIR).reduce((sum, f) => {
      const stat = fs.statSync(path.join(STORAGE_DIR, f));
      return sum + stat.size;
    }, 0);
  }

  async #getSession(uploadId) {
    const session = await redis.hgetall(sessionKey(uploadId));
    if (!session || Object.keys(session).length === 0)
      throw new NotFoundError("Session not found");
    return session;
  }
}
