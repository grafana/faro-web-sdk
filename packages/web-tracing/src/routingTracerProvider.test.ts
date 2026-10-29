import { ROOT_CONTEXT, trace, TraceFlags } from '@opentelemetry/api';
import type { Span, Tracer, TracerOptions, TracerProvider } from '@opentelemetry/api';

import { RoutingTracerProvider } from './routingTracerProvider';
import type { TracingRegistration } from './tracingRegistry';

function makeRegistration(provider: TracerProvider, registrationId: number): TracingRegistration {
  return {
    registrationId,
    appName: `app-${registrationId}`,
    isolate: true,
    configuration: {},
    provider,
    state: 'active',
  };
}

describe('RoutingTracerProvider', () => {
  it('preserves scope, options, and an explicit parent context while delegating', () => {
    const span = { end: jest.fn() } as unknown as Span;
    const targetTracer = {
      startSpan: jest.fn(() => span),
      startActiveSpan: jest.fn(),
    } as unknown as Tracer;
    const provider = {
      getTracer: jest.fn((_name: string, _version?: string, _options?: TracerOptions) => targetTracer),
    } as unknown as TracerProvider;
    const registration = makeRegistration(provider, 1);
    const routing = new RoutingTracerProvider(() => ({
      registration,
      strategy: 'api-url',
      fallback: false,
    }));
    const instrumentationOptions = { schemaUrl: 'https://example.test/schema' };
    const tracer = routing.getTracer('example-instrumentation', '1.2.3', instrumentationOptions);
    const spanOptions = { attributes: { 'url.full': 'https://api.example.test/orders' } };
    const parentContext = trace.setSpanContext(ROOT_CONTEXT, {
      traceId: '0af7651916cd43dd8448eb211c80319c',
      spanId: 'b7ad6b7169203331',
      traceFlags: TraceFlags.SAMPLED,
    });

    tracer.startSpan('GET', spanOptions, parentContext);

    expect(provider.getTracer).toHaveBeenCalledWith('example-instrumentation', '1.2.3', instrumentationOptions);
    expect(targetTracer.startSpan).toHaveBeenCalledWith(
      'GET',
      {
        ...spanOptions,
        attributes: {
          ...spanOptions.attributes,
          'faro.attribution.strategy': 'api-url',
          'faro.attribution.fallback': false,
        },
      },
      parentContext
    );
  });

  it('resolves the destination for every new span instead of caching a fallback', () => {
    const firstTracer = { startSpan: jest.fn(() => ({ end: jest.fn() }) as unknown as Span) } as unknown as Tracer;
    const secondTracer = { startSpan: jest.fn(() => ({ end: jest.fn() }) as unknown as Span) } as unknown as Tracer;
    const firstProvider = { getTracer: jest.fn(() => firstTracer) } as unknown as TracerProvider;
    const secondProvider = { getTracer: jest.fn(() => secondTracer) } as unknown as TracerProvider;
    const first = makeRegistration(firstProvider, 1);
    const second = makeRegistration(secondProvider, 2);
    let destination = first;
    const routing = new RoutingTracerProvider(() => ({ registration: destination }));
    const tracer = routing.getTracer('scope');

    const firstSpan = tracer.startSpan('first');
    destination = second;
    tracer.startSpan('second');
    firstSpan.end();

    expect(firstTracer.startSpan).toHaveBeenCalledWith('first', {}, undefined);
    expect(secondTracer.startSpan).toHaveBeenCalledWith('second', {}, undefined);
    expect((firstSpan.end as jest.Mock).mock.calls).toHaveLength(1);
  });

  it('delegates startActiveSpan overloads to the selected provider', () => {
    const callback = jest.fn(() => 'result');
    const targetTracer = {
      startSpan: jest.fn(),
      startActiveSpan: jest.fn(() => 'result'),
    } as unknown as Tracer;
    const provider = { getTracer: jest.fn(() => targetTracer) } as unknown as TracerProvider;
    const routing = new RoutingTracerProvider(() => ({ registration: makeRegistration(provider, 1) }));
    const tracer = routing.getTracer('scope');

    expect(tracer.startActiveSpan('operation', callback)).toBe('result');
    expect(targetTracer.startActiveSpan).toHaveBeenCalledWith('operation', callback);
    expect(callback).not.toHaveBeenCalled();
  });

  it('bypasses the app provider when the resolved request is already suppressed', () => {
    const targetTracer = { startSpan: jest.fn() } as unknown as Tracer;
    const provider = { getTracer: jest.fn(() => targetTracer) } as unknown as TracerProvider;
    const routing = new RoutingTracerProvider(() => ({
      registration: makeRegistration(provider, 1),
      strategy: 'api-url',
      fallback: false,
      suppressed: true,
    }));

    const span = routing.getTracer('scope').startSpan('excluded', {
      attributes: { 'url.full': 'https://collector.example.test' },
    });

    expect(span.isRecording()).toBe(false);
    expect(targetTracer.startSpan).not.toHaveBeenCalled();
  });

  it('suppresses an already-created span at end when the app pauses before send', () => {
    let suppressed = false;
    const originalEnd = jest.fn();
    const secondEnd = jest.fn();
    const targetSpans = [
      { end: originalEnd, isRecording: jest.fn(() => true) },
      { end: secondEnd, isRecording: jest.fn(() => true) },
    ] as unknown as Span[];
    const targetTracer = {
      startSpan: jest.fn(() => targetSpans.shift()),
    } as unknown as Tracer;
    const provider = { getTracer: jest.fn(() => targetTracer) } as unknown as TracerProvider;
    const routing = new RoutingTracerProvider(() => ({
      registration: makeRegistration(provider, 1),
      strategy: 'page-route',
      fallback: false,
      shouldSuppress: () => suppressed,
    }));

    const span = routing.getTracer('scope').startSpan('xhr', {
      attributes: { 'url.full': 'https://api.example.test/orders' },
    });
    suppressed = true;
    span.end();
    expect(originalEnd).not.toHaveBeenCalled();

    suppressed = false;
    const secondSpan = routing.getTracer('scope').startSpan('xhr-2', {
      attributes: { 'url.full': 'https://api.example.test/orders' },
    });
    secondSpan.end();
    expect(secondEnd).toHaveBeenCalledTimes(1);
  });

  it('inherits open-time ownership for auxiliary spans created without a URL', () => {
    const requestSpan = { end: jest.fn() } as unknown as Span;
    const auxiliarySpan = { end: jest.fn() } as unknown as Span;
    const targetTracer = {
      startSpan: jest.fn().mockReturnValueOnce(requestSpan).mockReturnValueOnce(auxiliarySpan),
      startActiveSpan: jest.fn(),
    } as unknown as Tracer;
    const provider = { getTracer: jest.fn(() => targetTracer) } as unknown as TracerProvider;
    const registration = makeRegistration(provider, 1);
    const routing = new RoutingTracerProvider(() => ({
      registration,
      strategy: 'page-route',
      fallback: false,
    }));
    const tracer = routing.getTracer('@opentelemetry/instrumentation-fetch');
    const requestContext = trace.setSpan(ROOT_CONTEXT, requestSpan);

    tracer.startSpan('HTTP GET', { attributes: { 'url.full': 'https://api.example.test/orders' } });
    tracer.startSpan('CORS Preflight', {}, requestContext);

    expect(targetTracer.startSpan).toHaveBeenNthCalledWith(
      2,
      'CORS Preflight',
      {
        attributes: {
          'faro.attribution.strategy': 'page-route',
          'faro.attribution.fallback': false,
        },
      },
      requestContext
    );
  });

  it('returns a no-op tracer when no active registration can receive a span', () => {
    const routing = new RoutingTracerProvider(() => undefined);
    const span = routing.getTracer('scope').startSpan('orphan');

    expect(span.isRecording()).toBe(false);
  });
});
