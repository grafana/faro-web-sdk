import { trace } from '@opentelemetry/api';
import type { Span, SpanContext } from '@opentelemetry/api';

export function getActiveSpan(): Span | undefined {
  return trace.getActiveSpan();
}

export function getActiveSpanContext(): SpanContext | undefined {
  return getActiveSpan()?.spanContext();
}
