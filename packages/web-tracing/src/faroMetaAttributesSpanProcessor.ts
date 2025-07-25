import type { Context } from '@opentelemetry/api';
import type { ReadableSpan, Span, SpanProcessor } from '@opentelemetry/sdk-trace-web';

import type { Metas } from '@grafana/faro-web-sdk';

import { ATTR_SESSION_ID } from './semconv';

export class FaroMetaAttributesSpanProcessor implements SpanProcessor {
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

    const user = this.metas.value.user ?? {};

    if (user.email) {
      span.attributes['user.email'] = user.email;
    }

    if (user.id) {
      span.attributes['user.id'] = user.id;
    }

    if (user.username) {
      span.attributes['user.name'] = user.username;
    }

    if (user.fullName) {
      span.attributes['user.full_name'] = user.fullName;
    }

    if (user.roles) {
      span.attributes['user.roles'] = user.roles.split(',').map((role) => role.trim());
    }

    if (user.hash) {
      span.attributes['user.hash'] = user.hash;
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
