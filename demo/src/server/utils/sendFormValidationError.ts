import type { Response } from 'express';

export function sendFormValidationError(res: Response, field: string, message: string, statusCode = 400): void {
  res.status(statusCode).send({ field, message });
}
