import { AppError } from "../exceptions/appError.js";

export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, ...err.data });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal error' });
}