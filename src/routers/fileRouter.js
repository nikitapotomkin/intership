import { Router } from 'express';
import { FileController } from '../controllers/fileController.js';
import { FileService } from '../services/fileService.js';

const fileService = new FileService();
const fileController = new FileController(fileService);

const fileRouter = new Router();

fileRouter.get(`/`, fileController.handleListFiles);
fileRouter.get(`/:fileName`, fileController.handleViewFile);
fileRouter.delete(`/:fileName`, fileController.handleDeleteFile);

export {fileRouter};