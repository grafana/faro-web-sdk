import { type Context, SpanKind } from '@opentelemetry/api';
import type { ReadableSpan, Span, SpanProcessor } from '@opentelemetry/sdk-trace-web';

import { faro, UserActionState } from '@grafana/faro-core';

export class FaroUserActionSpanProcessor implements SpanProcessor {
  constructor(private processor: SpanProcessor) {}

  forceFlush(): Promise<void> {
    return this.processor.forceFlush();
  }

  onStart(span: Span, parentContext: Context): void {
    const userAction = faro.api.getCurrentAction();
    if (userAction && userAction.getState() === UserActionState.Started && span.kind === SpanKind.CLIENT) {
      span.attributes['faro.action.user.name'] = userAction?.name;
      span.attributes['faro.action.user.parentId'] = userAction?.parentId;
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
