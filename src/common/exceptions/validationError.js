import { AppError } from "./appError.js";

export class ValidationError extends AppError {
  constructor(message = 'Missing fields') {
    super(message, 400);
  }
}