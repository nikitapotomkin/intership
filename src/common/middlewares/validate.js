import { ZodError } from 'zod';
import { ValidationError } from '../exceptions/validationError.js';

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      req[source] = schema.parse(req[source]);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.issues.map(e => e.message).join(', ');
        return next(new ValidationError(message));
      }
      next(err);
    }
  };
}