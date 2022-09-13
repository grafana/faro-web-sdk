import { agent } from '@grafana/agent-core';
import type { Context } from '@opentelemetry/api';
import type { ReadableSpan, Span, SpanProcessor } from '@opentelemetry/sdk-trace-base';

// adds grafana agent session id to every span
export class SessionSpanProcessor implements SpanProcessor {
  private processor: SpanProcessor;

  constructor(processor: SpanProcessor) {
    this.processor = processor;
  }

  forceFlush(): Promise<void> {
    return this.processor.forceFlush();
  }

  onStart(span: Span, parentContext: Context): void {
    const session = agent.metas.value.session;

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
