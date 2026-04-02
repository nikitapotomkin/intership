import { AppError } from "../exceptions/appError.js";
import { sendJSON } from "./sendJSON.js";

export function errorHandler(err, res) {
  if (err instanceof AppError) {
    return sendJSON(res, err.statusCode, { error: err.message, ...err.data });
  }
  console.error('Unhandled error:', err);
  sendJSON(res, 500, { error: 'Internal error' });
}