import type { Response } from './types';

export function sendFormValidationError(res: Response, field: string, message: string, statusCode = 400): void {
  res.status(statusCode).send({
    success: false,
    data: {
      field,
      message,
    },
    spanId: res.locals.requestSpanId,
    traceId: res.locals.requestTraceId,
  });
}
