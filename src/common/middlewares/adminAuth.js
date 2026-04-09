import { AppError } from '../exceptions/appError.js';

export function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'];

  if (!token || token !== process.env.ADMIN_TOKEN) {
    return next(new AppError(401, 'Unauthorized'));
  }

  next();
}