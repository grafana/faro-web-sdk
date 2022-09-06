import { isInstanceOf } from '@grafana/agent-core';
import type { Response } from 'express';

export function sendError(res: Response, message: Error | string, statusCode = 500): void {
  const actualMessage = isInstanceOf(message, Error) ? (message as Error).message : message;

  res.status(statusCode).send({ message: actualMessage });
}
