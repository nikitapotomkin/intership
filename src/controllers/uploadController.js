import { sendJSON } from "../common/utils/sendJSON.js";

export class UploadController {
  constructor(uploadService) {
    this.uploadService = uploadService;
  }

  handleUploadInit = async (req, res) => {
    const body = JSON.parse((await this.readBody(req)).toString());
    const session = await this.uploadService.initUpload(body);
    sendJSON(res, 200, session);
  };

  handleUploadChunk = async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const uploadId = url.searchParams.get("uploadId");
    const chunkIndex = parseInt(url.searchParams.get("chunkIndex"), 10);
    const chunkData = await this.readBody(req);

    const progress = await this.uploadService.saveChunk(
      uploadId,
      chunkIndex,
      chunkData,
    );
    sendJSON(res, 200, { chunkIndex, ...progress });
  };

  handleUploadComplete = async (req, res) => {
    const body = JSON.parse((await this.readBody(req)).toString());
    const result = await this.uploadService.completeUpload(body.uploadId);
    sendJSON(res, 200, { success: true, ...result });
  };

  readBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => resolve(Buffer.concat(chunks)));
      req.on("error", reject);
    });
  }

  handleUploadStatus = async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const uploadId = url.searchParams.get("uploadId");
    const status = await this.uploadService.getStatus(uploadId);
    sendJSON(res, 200, status);
  };
}
