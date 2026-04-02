import { AppError } from "./appError.js";

export class AlreadyCompletedError extends AppError {
  constructor() {
    super('Upload already completed', 400);
  }
}