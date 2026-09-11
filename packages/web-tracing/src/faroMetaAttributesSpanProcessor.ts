import { type Context, diag } from '@opentelemetry/api';
import type { ReadableSpan, Span, SpanProcessor } from '@opentelemetry/sdk-trace-web';

import type { Meta, Metas } from '@grafana/faro-web-sdk';

import { ATTR_SESSION_ID } from './semconv';

// null records a rejected start; undefined is an unwrapped, externally supplied span.
export const spanMetas: WeakMap<ReadableSpan, Meta | null> = new WeakMap();

export class FaroMetaAttributesSpanProcessor implements SpanProcessor {
  constructor(
    private processor: SpanProcessor,
    private metas: Metas
  ) {}

  forceFlush(): Promise<void> {
    return this.processor.forceFlush();
  }

  onStart(span: Span, parentContext: Context): void {
    spanMetas.set(span, null);
    try {
      this.metas.assertCaptureAllowed?.();
      const meta = { ...this.metas.value };
      const session = meta.session;

      if (session?.id) {
        span.attributes[ATTR_SESSION_ID] = session.id;
      }

      const user = meta.user ?? {};

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

      this.metas.assertCaptureAllowed?.();
      spanMetas.set(span, meta);
    } catch (error) {
      diag.warn('Discarding span because Faro metadata capture failed', error);
      return;
    }

    this.processor.onStart(span, parentContext);
  }

  onEnd(span: ReadableSpan): void {
    if (spanMetas.get(span) !== null) {
      this.processor.onEnd(span);
    }
  }

  shutdown(): Promise<void> {
    return this.processor.shutdown();
  }
}
