import { ROOT_CONTEXT, trace, TraceFlags } from '@opentelemetry/api';
import type { TextMapPropagator } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';

import type { MetaSession } from '@grafana/faro-web-sdk';

import { FaroPausablePropagator } from './faroPausablePropagator';
import { isSessionSampled } from './sampler';

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

describe('FaroPausablePropagator / unsampled sessions', () => {
  // The span context is deliberately SAMPLED: an unsampled Faro session still produces a span
  // context, and today it is that context which gets injected as a `traceparent` ending in `00`.
  const contextWithSpan = trace.setSpanContext(ROOT_CONTEXT, {
    traceId: '0af7651916cd43dd8448eb211c80319c',
    spanId: 'b7ad6b7169203331',
    traceFlags: TraceFlags.SAMPLED,
  });

  const setter = {
    set: (carrier: Record<string, string>, key: string, value: string) => {
      carrier[key] = value;
    },
  };

  function injectInto(propagator: TextMapPropagator): Record<string, string> {
    const carrier: Record<string, string> = {};
    propagator.inject(contextWithSpan, carrier, setter);

    return carrier;
  }

  it('withholds the traceparent header while the session is not part of the sample', () => {
    let session: MetaSession = { attributes: { isSampled: 'false' } };
    const propagator = new FaroPausablePropagator(new W3CTraceContextPropagator(), () => !isSessionSampled(session));

    expect(injectInto(propagator)).toEqual({});

    session = { attributes: { isSampled: 'true' } };

    expect(injectInto(propagator)['traceparent']).toBe('00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01');
  });

  it('injects only when Faro is neither paused nor running an unsampled session', () => {
    let paused = false;
    let session: MetaSession = {};

    // Mirrors the predicate TracingInstrumentation builds with
    // omitTraceContextForUnsampledSessions enabled.
    const propagator = new FaroPausablePropagator(
      new W3CTraceContextPropagator(),
      () => paused || !isSessionSampled(session)
    );

    const injected = ([sampled, isPaused]: [boolean, boolean]) => {
      session = { attributes: { isSampled: String(sampled) } };
      paused = isPaused;

      return 'traceparent' in injectInto(propagator);
    };

    expect(injected([true, false])).toBe(true);
    expect(injected([true, true])).toBe(false);
    expect(injected([false, false])).toBe(false);
    expect(injected([false, true])).toBe(false);
  });

  it('delegates fields whether or not the trace context is withheld', () => {
    let session: MetaSession = { attributes: { isSampled: 'true' } };
    const delegate: jest.Mocked<TextMapPropagator> = {
      inject: jest.fn(),
      extract: jest.fn((context, _carrier, _getter) => context),
      fields: jest.fn(() => ['traceparent', 'tracestate']),
    };
    const propagator = new FaroPausablePropagator(delegate, () => !isSessionSampled(session));

    expect(propagator.fields()).toEqual(['traceparent', 'tracestate']);

    session = { attributes: { isSampled: 'false' } };

    expect(propagator.fields()).toEqual(['traceparent', 'tracestate']);
  });
});
