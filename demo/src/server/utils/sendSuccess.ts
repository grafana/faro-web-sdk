import type { Response } from 'express';

export function sendSuccess(res: Response, data: {} | any[], statusCode = 200): void {
  res.status(statusCode).send(data);
}
