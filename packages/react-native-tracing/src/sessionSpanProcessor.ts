import type { Context } from '@opentelemetry/api';
import type { ReadableSpan, Span, SpanProcessor } from '@opentelemetry/sdk-trace-web';

import type { Metas } from '@grafana/react-native-sdk';

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
      span.attributes["session.id"] = session.id;
      /**
       * @deprecated will be removed in the future and has been replaced by ATTR_SESSION_ID (session.id)
       */
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
