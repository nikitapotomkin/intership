import { Router } from 'express';
import { AdminController } from '../controllers/adminController.js';
import { AdminService } from '../services/adminService.js';
import { updateSettingsSchema } from '../common/schemas/adminSchemas.js';
import { validate } from '../common/middlewares/validate.js';
import { adminAuth } from '../common/middlewares/adminAuth.js';

const adminService = new AdminService();
const adminController = new AdminController(adminService);

const adminRouter = new Router();

adminRouter.get('/settings', adminController.handleGetSettings);
adminRouter.patch('/settings',adminAuth, validate(updateSettingsSchema), adminController.handleUpdateSettings);

export { adminRouter };