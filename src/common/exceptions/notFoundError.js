import { AppError } from "./appError.js";

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404);
  }
}