import type { Context } from '@opentelemetry/api';
import type { ReadableSpan, Span, SpanProcessor } from '@opentelemetry/sdk-trace-base';

import { faro } from '@grafana/faro-web-sdk';

// adds Faro session id to every span
export class FaroSessionSpanProcessor implements SpanProcessor {
  private processor: SpanProcessor;

  constructor(processor: SpanProcessor) {
    this.processor = processor;
  }

  forceFlush(): Promise<void> {
    return this.processor.forceFlush();
  }

  onStart(span: Span, parentContext: Context): void {
    const session = faro.metas.value.session;

    if (session?.id) {
      span.attributes['session_id'] = session.id;
    }

    this.processor.onStart(span, parentContext);
  }

  onEnd(span: ReadableSpan): void {
    this.processor.onEnd(span);
  }

  shutdown(): Promise<void> {
    return this.processor.shutdown();
  }
}
