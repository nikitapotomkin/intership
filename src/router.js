import { handleUI } from './common/utils/htmlView.js';
import { FileController } from './controllers/fileController.js';
import { UploadController } from './controllers/uploadController.js';
import { FileService } from './services/fileService.js';
import { UploadService } from './services/uploadService.js';
import { sendJSON } from './common/utils/sendJSON.js';

const fileService = new FileService();
const uploadService = new UploadService();

const fileController = new FileController(fileService);
const uploadController = new UploadController(uploadService);

const prefix = '/api';

const routes = [
  { path: '/', method: 'GET', handler: handleUI },

  { path: `${prefix}/files`, method: 'GET', handler: fileController.handleListFiles },
  { path: `${prefix}/files/:fileName`, method: 'GET', handler: fileController.handleViewFile },
  { path: `${prefix}/files/:fileName`, method: 'DELETE', handler: fileController.handleDeleteFile },
  { path: `${prefix}/upload/init`, method: 'POST', handler: uploadController.handleUploadInit },
  { path: `${prefix}/upload/chunk`, method: 'POST', handler: uploadController.handleUploadChunk },
  { path: `${prefix}/upload/complete`, method: 'POST', handler: uploadController.handleUploadComplete },
  { path: `${prefix}/upload/status`, method: 'GET', handler: uploadController.handleUploadStatus },
];

export async function router(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;
  const method = req.method;

  for (const route of routes) {
    const routePattern = route.path.replace(/:([^/]+)/g, '([^/]+)');
    const match = pathname.match(new RegExp(`^${routePattern}$`));

    if (match && method === route.method) {
      const params = {};
      const paramNames = [...route.path.matchAll(/:([^/]+)/g)].map(m => m[1]);
      paramNames.forEach((name, i) => params[name] = decodeURIComponent(match[i + 1]));

      return route.handler(req, res, params);
    }
  }

  sendJSON(res, 404, { error: 'Not found' });
}