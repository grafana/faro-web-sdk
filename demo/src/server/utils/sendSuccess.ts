import type { Response } from './types';

export function sendSuccess(res: Response, data: {} | any[] | boolean, statusCode = 200): void {
  res.status(statusCode).send({
    data,
    spanId: res.locals.requestSpanId,
    success: true,
    traceId: res.locals.requestTraceId,
  });
}
