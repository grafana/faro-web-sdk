import type { Response } from 'express';

import { isInstanceOf } from '@grafana/agent-core';

export function sendError(res: Response, message: Error | string, statusCode = 500, additionalProperties = {}): void {
  const actualMessage = isInstanceOf(message, Error) ? (message as Error).message : message;

  res.status(statusCode).send({ message: actualMessage, ...additionalProperties });
}
