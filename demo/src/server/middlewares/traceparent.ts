import type { RequestHandler } from '../utils';

export const traceparentMiddleware: RequestHandler = async (req, res, next) => {
  const { traceparent } = req.headers;
  const [, traceId, spanId] = ((traceparent ?? '') as string).split('-');

  res.locals.requestTraceId = traceId ?? null;
  res.locals.requestSpanId = spanId ?? null;

  next();
};
