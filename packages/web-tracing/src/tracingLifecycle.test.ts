import { ROOT_CONTEXT, trace } from '@opentelemetry/api';
import type { Context } from '@opentelemetry/api';
import type { ReadableSpan, Span, SpanProcessor } from '@opentelemetry/sdk-trace-web';

import { TracingLifecycle, TracingLifecycleSpanProcessor } from './tracingLifecycle';

function span(): Span {
  return {} as Span;
}

function processor(): jest.Mocked<SpanProcessor> {
  return {
    forceFlush: jest.fn(() => Promise.resolve()),
    onStart: jest.fn(),
    onEnd: jest.fn(),
    shutdown: jest.fn(() => Promise.resolve()),
  };
}

describe('TracingLifecycle', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps an in-flight span until it ends, then flushes and removes the registration', async () => {
    const onComplete = jest.fn();
    const provider = {
      forceFlush: jest.fn(() => Promise.resolve()),
      shutdown: jest.fn(() => Promise.resolve()),
    };
    const lifecycle = new TracingLifecycle(30_000, onComplete);
    const managed = processor();
    const spanObject = span();
    const processorWithLifecycle = new TracingLifecycleSpanProcessor(managed, lifecycle);

    processorWithLifecycle.onStart(spanObject, {} as Context);
    lifecycle.beginDrain(provider);
    expect(onComplete).not.toHaveBeenCalled();

    processorWithLifecycle.onEnd(spanObject as unknown as ReadableSpan);
    await Promise.resolve();

    expect(managed.onEnd).toHaveBeenCalledWith(spanObject);
    expect(provider.forceFlush).toHaveBeenCalledTimes(1);
    expect(provider.shutdown).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('admits a CORS auxiliary span from a tracked request during drain', async () => {
    const onComplete = jest.fn();
    const provider = {
      forceFlush: jest.fn(() => Promise.resolve()),
      shutdown: jest.fn(() => Promise.resolve()),
    };
    const lifecycle = new TracingLifecycle(30_000, onComplete);
    const managed = processor();
    const parent = span();
    const child = span();
    const processorWithLifecycle = new TracingLifecycleSpanProcessor(managed, lifecycle);

    processorWithLifecycle.onStart(parent, {} as Context);
    lifecycle.allowAuxiliarySpan(parent);
    lifecycle.beginDrain(provider);
    processorWithLifecycle.onStart(child, trace.setSpan(ROOT_CONTEXT, parent));
    processorWithLifecycle.onEnd(child as unknown as ReadableSpan);
    processorWithLifecycle.onEnd(parent as unknown as ReadableSpan);
    await Promise.resolve();

    expect(managed.onStart).toHaveBeenCalledWith(child, expect.anything());
    expect(managed.onEnd).toHaveBeenCalledWith(child);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('expires once and drops late completions without delegating them', async () => {
    jest.useFakeTimers();
    const onComplete = jest.fn();
    const provider = {
      forceFlush: jest.fn(() => Promise.resolve()),
      shutdown: jest.fn(() => Promise.resolve()),
    };
    const lifecycle = new TracingLifecycle(100, onComplete);
    const managed = processor();
    const spanObject = span();
    const processorWithLifecycle = new TracingLifecycleSpanProcessor(managed, lifecycle);

    processorWithLifecycle.onStart(spanObject, {} as Context);
    lifecycle.beginDrain(provider);
    jest.advanceTimersByTime(100);
    await Promise.resolve();
    processorWithLifecycle.onEnd(spanObject as unknown as ReadableSpan);

    expect(lifecycle.isExpired).toBe(true);
    expect(managed.onEnd).not.toHaveBeenCalled();
    expect(provider.shutdown).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
