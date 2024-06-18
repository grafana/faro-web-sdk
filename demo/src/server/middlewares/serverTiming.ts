import { trace } from '@opentelemetry/api';

import type { RequestHandler } from '../utils';

export const serverTimingMiddleware: RequestHandler = async (req, res, next) => {
  const span = trace.getActiveSpan();

  // inject server-timing header and format as traceparent
  // {version}-{trace_id}-{span_id}-{trace_flags}
  res.setHeader(
    'Server-Timing',
    `traceparent;desc="00-${span?.spanContext().traceId}-${span?.spanContext().spanId}-${span
      ?.spanContext()
      .traceFlags.toString()}"`
  );

  next();
};
