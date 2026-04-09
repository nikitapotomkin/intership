import "dotenv/config";
import fs from 'fs';
import express from "express";
import { handleUI } from "./common/utils/htmlView.js";
import { errorHandler } from "./common/utils/errorHandler.js";
import { fileRouter } from "./routers/fileRouter.js";
import { uploadRouter } from "./routers/uploadRouter.js";
import { adminRouter } from "./routers/adminRouter.js";
import { getChunkSize } from "./common/constants/chunkSize.js";
import { STORAGE_DIR } from "./common/constants/storageDir.js";

if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
  console.log(`Created storage directory at ${STORAGE_DIR}`);
}

const API_PREFIX = "/api/v1";
const app = express();
app.use(express.json());

app.get("/", handleUI);

app.use(`${API_PREFIX}/uploads/:id/chunks/:chunkIndex`, (req, res, next) => {
  getChunkSize().then((chunkSize) => {
    express.raw({
      type: "application/octet-stream",
      limit: chunkSize,
    })(req, res, next);
  }).catch(next);
});

app.use(`${API_PREFIX}/files`, fileRouter);
app.use(`${API_PREFIX}/uploads`, uploadRouter);
app.use(`${API_PREFIX}/admin`, adminRouter);

app.use(errorHandler);

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server started: http://localhost:${PORT}`);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});