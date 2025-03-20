import { type Context, SpanKind } from '@opentelemetry/api';
import type { ReadableSpan, Span, SpanProcessor } from '@opentelemetry/sdk-trace-web';

import { apiMessageBus, type UserActionStartMessage } from '@grafana/faro-web-sdk';

export class FaroUserActionSpanProcessor implements SpanProcessor {
  message: UserActionStartMessage | undefined;

  constructor(private processor: SpanProcessor) {
    apiMessageBus.subscribe((msg) => {
      console.log(msg);
      if (msg.type === 'user-action-start') {
        this.message = msg;
        return;
      }

      if (['user-action-end', 'user-action-cancel'].includes(msg.type)) {
        this.message = undefined;
      }
    });
  }

  forceFlush(): Promise<void> {
    return this.processor.forceFlush();
  }

  onStart(span: Span, parentContext: Context): void {
    if (span.kind === SpanKind.CLIENT) {
      // If the span is created when the message object is available it is created before the user action timeout has been reached so it belongs to the user-action.
      // In this case we can add the user action name and parentId to the span attributes.
      // If the span is created after the user action timeout span, the message object will be undefined which means the action has been cancelled or is ended.
      if (this.message) {
        span.attributes['faro.action.user.name'] = this.message?.name;
        span.attributes['faro.action.user.parentId'] = this.message?.parentId;
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
