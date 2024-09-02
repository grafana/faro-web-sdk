import type { Context } from '@opentelemetry/api';
import type { ReadableSpan, Span, SpanProcessor } from '@opentelemetry/sdk-trace-web';
// eslint-disable-next-line import/no-unresolved
// eslint-disable-next-line import/no-unresolved
import { ATTR_SESSION_ID } from '@opentelemetry/semantic-conventions/incubating';

import type { Metas } from '@grafana/faro-web-sdk';

// adds Faro session id to every span
export class FaroSessionSpanProcessor implements SpanProcessor {
  constructor(
    private processor: SpanProcessor,
    private metas: Metas
  ) {}

  forceFlush(): Promise<void> {
    return this.processor.forceFlush();
  }

  onStart(span: Span, parentContext: Context): void {
    const session = this.metas.value.session;

    if (session?.id) {
      span.attributes[ATTR_SESSION_ID] = session.id;
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
