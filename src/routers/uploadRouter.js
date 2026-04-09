import { Router } from 'express';
import { UploadController } from '../controllers/uploadController.js';
import { UploadService } from '../services/uploadService.js';
import { chunkSchema, completeSchema, initUploadSchema } from '../common/schemas/uploadSchemas.js';
import { validate } from '../common/middlewares/validate.js';

const uploadService = new UploadService();
const uploadController = new UploadController(uploadService);

const uploadRouter = new Router();

uploadRouter.post('/', validate(initUploadSchema), uploadController.handleUploadInit);
uploadRouter.put('/:id/chunks/:chunkIndex',validate(chunkSchema,'params'), uploadController.handleUploadChunk);
uploadRouter.post('/:id/complete',validate(completeSchema,'params'), uploadController.handleUploadComplete);
uploadRouter.get('/:id', uploadController.handleUploadStatus);

export {uploadRouter};