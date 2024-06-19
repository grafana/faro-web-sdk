import { trace } from '@opentelemetry/api';

import type { RequestHandler } from '../utils';

export const serverTimingMiddleware: RequestHandler = async (_req, res, next) => {
  const span = trace.getActiveSpan();

  if (span != null) {
    const { traceId, spanId, traceFlags } = span.spanContext();
    const w3cTraceparent = `traceparent;desc="00-${traceId}-${spanId}-${traceFlags}"`;

    res.setHeader('Server-Timing', w3cTraceparent);
  }

  next();
};
