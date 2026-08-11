import { ROOT_CONTEXT, trace, TraceFlags } from '@opentelemetry/api';
import type { TextMapPropagator } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';

import { FaroPausablePropagator } from './faroPausablePropagator';

describe('FaroPausablePropagator', () => {
  let paused: boolean;
  let delegate: jest.Mocked<TextMapPropagator>;
  let propagator: FaroPausablePropagator;

  beforeEach(() => {
    paused = false;
    delegate = {
      inject: jest.fn(),
      extract: jest.fn((context, _carrier, _getter) => context),
      fields: jest.fn(() => ['traceparent', 'tracestate']),
    };
    propagator = new FaroPausablePropagator(delegate, () => paused);
  });

  it('injects while not paused', () => {
    const carrier = {};
    const setter = { set: jest.fn() };

    propagator.inject(ROOT_CONTEXT, carrier, setter);

    expect(delegate.inject).toHaveBeenCalledWith(ROOT_CONTEXT, carrier, setter);
  });

  it('does not inject while paused', () => {
    paused = true;

    propagator.inject(ROOT_CONTEXT, {}, { set: jest.fn() });

    expect(delegate.inject).not.toHaveBeenCalled();
  });

  it('reads the paused state per call rather than at construction time', () => {
    const setter = { set: jest.fn() };

    propagator.inject(ROOT_CONTEXT, {}, setter);
    paused = true;
    propagator.inject(ROOT_CONTEXT, {}, setter);
    paused = false;
    propagator.inject(ROOT_CONTEXT, {}, setter);

    expect(delegate.inject).toHaveBeenCalledTimes(2);
  });

  it('keeps extracting while paused so a resumed session stays on the same trace', () => {
    paused = true;
    const carrier = {};
    const getter = { get: jest.fn(), keys: jest.fn(() => []) };

    propagator.extract(ROOT_CONTEXT, carrier, getter);

    expect(delegate.extract).toHaveBeenCalledWith(ROOT_CONTEXT, carrier, getter);
  });

  it('delegates fields', () => {
    expect(propagator.fields()).toEqual(['traceparent', 'tracestate']);
  });

  it('omits the traceparent header from a real carrier while paused', () => {
    const w3c = new FaroPausablePropagator(new W3CTraceContextPropagator(), () => paused);
    const setter = {
      set: (carrier: Record<string, string>, key: string, value: string) => {
        carrier[key] = value;
      },
    };
    const contextWithSpan = trace.setSpanContext(ROOT_CONTEXT, {
      traceId: '0af7651916cd43dd8448eb211c80319c',
      spanId: 'b7ad6b7169203331',
      traceFlags: TraceFlags.SAMPLED,
    });

    const activeCarrier: Record<string, string> = {};
    w3c.inject(contextWithSpan, activeCarrier, setter);

    expect(activeCarrier['traceparent']).toBe('00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01');

    paused = true;
    const pausedCarrier: Record<string, string> = {};
    w3c.inject(contextWithSpan, pausedCarrier, setter);

    expect(pausedCarrier).toEqual({});
  });
});
