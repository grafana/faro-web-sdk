import type { Context } from '@opentelemetry/api';
import { BasicTracerProvider } from '@opentelemetry/sdk-trace-web';
import type { ReadableSpan, Span as SDKSpan, SpanProcessor } from '@opentelemetry/sdk-trace-web';

import { FaroXhrInstrumentation } from './faroXhrInstrumentation';

class StartedSpanProcessor implements SpanProcessor {
  started: SDKSpan[] = [];

  onStart(span: SDKSpan, _parentContext: Context): void {
    this.started.push(span);
  }

  onEnd(_span: ReadableSpan): void {}

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}

describe('FaroXhrInstrumentation', () => {
  it.each(['_isEnabled', '_enabled'] as const)('creates a span on open when %s indicates enabled', (flagName) => {
    const processor = new StartedSpanProcessor();
    const provider = new BasicTracerProvider({ spanProcessors: [processor] });
    const instrumentation = new FaroXhrInstrumentation();
    const flags = instrumentation as unknown as { _isEnabled?: boolean; _enabled?: boolean };

    try {
      instrumentation.setTracerProvider(provider);
      instrumentation.enable();

      if (flagName === '_enabled') {
        flags._enabled = true;
        flags._isEnabled = undefined;
      }

      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/enabled');

      expect(processor.started).toHaveLength(1);
    } finally {
      flags._isEnabled = true;
      instrumentation.disable();
      (instrumentation as unknown as { _unwrap: (target: object, method: string) => void })._unwrap(
        XMLHttpRequest.prototype,
        'open'
      );
      (instrumentation as unknown as { _unwrap: (target: object, method: string) => void })._unwrap(
        XMLHttpRequest.prototype,
        'send'
      );
    }
  });

  it('does not create spans through its open override while disabled', () => {
    const processor = new StartedSpanProcessor();
    const provider = new BasicTracerProvider({ spanProcessors: [processor] });
    const instrumentation = new FaroXhrInstrumentation({ enabled: false });

    try {
      instrumentation.setTracerProvider(provider);
      instrumentation.enable();
      instrumentation.disable();

      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/dormant');

      expect(processor.started).toHaveLength(0);
    } finally {
      instrumentation.disable();
      (instrumentation as unknown as { _unwrap: (target: object, method: string) => void })._unwrap(
        XMLHttpRequest.prototype,
        'open'
      );
      (instrumentation as unknown as { _unwrap: (target: object, method: string) => void })._unwrap(
        XMLHttpRequest.prototype,
        'send'
      );
    }
  });
});
