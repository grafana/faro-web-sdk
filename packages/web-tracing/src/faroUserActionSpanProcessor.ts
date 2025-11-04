import { type Context, SpanKind } from '@opentelemetry/api';
import type { ReadableSpan, Span, SpanProcessor } from '@opentelemetry/sdk-trace-web';

import { faro, type UserActionInternalInterface, UserActionState } from '@grafana/faro-web-sdk';

// There is very rare race condition that would result in span being attached to different user action. As shown in the diagram below.
// The scenario is the following
//
// 1. User action (id = 1) starts
// 2. Things happen for a given amount of time
// 3. User action ends
// 4. Span processor starts
// 5. A new user action (id = 2) starts
// 6. Span processor tries to attach the `faro.user.action` attributes based on the state of the current user action which is id = 2.
//
// This ultimately depends on the processing delay of the span processor which deems this race condition highly unlikely.
export class FaroUserActionSpanProcessor implements SpanProcessor {
  constructor(private processor: SpanProcessor) {}

  forceFlush(): Promise<void> {
    return this.processor.forceFlush();
  }

  onStart(span: Span, parentContext: Context): void {
    const userAction = faro.api.getActiveUserAction();
    if (
      userAction &&
      (userAction as unknown as UserActionInternalInterface)?.getState() === UserActionState.Started &&
      span.kind === SpanKind.CLIENT
    ) {
      if (!span.attributes['faro.action.user.name']) {
        span.attributes['faro.action.user.name'] = userAction?.name;
      }
      if (!span.attributes['faro.action.user.parentId']) {
        span.attributes['faro.action.user.parentId'] = userAction?.parentId;
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
