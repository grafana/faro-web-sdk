import { isInstanceOf } from '@grafana/faro-core';

import type { Response } from './types';

export function sendError(res: Response, message: Error | string, statusCode = 500, additionalProperties = {}): void {
  const actualMessage = isInstanceOf(message, Error) ? (message as Error).message : message;

  res.status(statusCode).send({
    success: false,
    data: {
      message: actualMessage,
      ...additionalProperties,
    },
    spanId: res.locals.requestSpanId,
    traceId: res.locals.requestTraceId,
  });
}
