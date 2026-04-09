import fs from "fs";
import path from "path";
import { lookup } from "mime-types";
import { NotFoundError } from "../common/exceptions/notFoundError.js";
import { STORAGE_DIR } from "../common/constants/storageDir.js";
import { getStorageQuota } from "../common/constants/storageQuota.js";

export class FileService {
  async listFilesWithSummary() {
    const files = fs.readdirSync(STORAGE_DIR).map((fileName) => {
      const filePath = path.join(STORAGE_DIR, fileName);
      const stat = fs.statSync(filePath);

      return {
        name: fileName,
        size: stat.size,
        sizeFormatted: this.formatSize(stat.size),
        modified: stat.mtime,
        mime: lookup(fileName) || "application/octet-stream",
      };
    });

    const storageUsed = files.reduce((sum, f) => sum + f.size, 0);
    const storageQuota = await getStorageQuota();
    const storagePercent = Math.round((storageUsed / storageQuota) * 100);

    return {
      files,
      storageUsed,
      storageQuota,
      storagePercent,
      storageUsedFormatted: this.formatSize(storageUsed),
      storageQuotaFormatted: this.formatSize(storageQuota),
    };
  }

  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  getMime(filename) {
    const ext = path.extname(filename).toLowerCase();
    const map = {
      ".txt": "text/plain",
      ".html": "text/html",
      ".css": "text/css",
      ".js": "application/javascript",
      ".json": "application/json",
      ".pdf": "application/pdf",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".zip": "application/zip",
      ".csv": "text/csv",
    };
    return map[ext] || "application/octet-stream";
  }

  getFileStream(fileName) {
    const filePath = path.join(STORAGE_DIR, fileName);

    if (!fs.existsSync(filePath)) throw new NotFoundError("File not found");

    const stat = fs.statSync(filePath);
    const mime = this.getMime(fileName);

    const isInline =
      mime.startsWith("text/") ||
      mime.startsWith("image/") ||
      mime === "application/pdf" ||
      mime.startsWith("video/") ||
      mime.startsWith("audio/");

    return {
      stream: fs.createReadStream(filePath),
      headers: {
        "Content-Type": mime,
        "Content-Length": stat.size,
        "Content-Disposition": `${isInline ? "inline" : "attachment"}; filename="${fileName}"`,
        "Access-Control-Allow-Origin": "*",
      },
    };
  }

  async deleteFile(fileName) {
    const filePath = path.join(STORAGE_DIR, fileName);

    if (!fs.existsSync(filePath)) throw new NotFoundError("File not found");

    fs.unlinkSync(filePath);

    return this.listFilesWithSummary();
  }
}