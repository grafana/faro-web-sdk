import { type Context, SpanKind } from '@opentelemetry/api';
import type { ReadableSpan, Span, SpanProcessor } from '@opentelemetry/sdk-trace-web';

import { apiMessageBus, type UserActionStartMessage } from '@grafana/faro-web-sdk';

let message: UserActionStartMessage | undefined;

apiMessageBus.subscribe((msg) => {
  if (msg.type === 'user-action-start') {
    message = msg;
    return;
  }

  if (['user-action-end', 'user-action-cancel'].includes(msg.type)) {
    message = undefined;
  }
});

export class FaroUserActionSpanProcessor implements SpanProcessor {
  constructor(private processor: SpanProcessor) {}

  forceFlush(): Promise<void> {
    return this.processor.forceFlush();
  }

  onStart(span: Span, parentContext: Context): void {
    if (span.kind === SpanKind.CLIENT) {
      // If the span is created when teh message object is available it is created during the user action timeout span.
      // In this case we can add the user action name and parentId to the span attributes.
      // If the span is created after the user action timeout span, the message object will be undefined which means the action has been cancelled or is ended.
      if (message) {
        span.attributes['faro.action.user.name'] = message?.name;
        span.attributes['faro.action.user.parentId'] = message?.parentId;
      }
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
