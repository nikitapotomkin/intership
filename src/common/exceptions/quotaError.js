import { AppError } from "./appError.js";

export class QuotaError extends AppError {
  constructor(used, fileSize) {
    super('Quota exceeded', 413);
    this.data = { used, fileSize };
  }
}