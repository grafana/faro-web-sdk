import { context, ROOT_CONTEXT, trace, TraceFlags } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { BasicTracerProvider, SamplingDecision, StackContextManager } from '@opentelemetry/sdk-trace-web';

import { FaroPausablePropagator } from './faroPausablePropagator';
import { RoutingTracerProvider } from './routingTracerProvider';
import type { TracingRegistration } from './tracingRegistry';

function parentContext() {
  return trace.setSpanContext(ROOT_CONTEXT, {
    traceId: '0af7651916cd43dd8448eb211c80319c',
    spanId: 'b7ad6b7169203331',
    traceFlags: TraceFlags.SAMPLED,
  });
}

describe('routing session sampling and propagation', () => {
  let contextManager: StackContextManager;

  beforeEach(() => {
    context.disable();
    contextManager = new StackContextManager();
    context.setGlobalContextManager(contextManager.enable());
  });

  afterEach(() => {
    contextManager.disable();
    context.disable();
  });

  it('keeps default propagation eligible for an unsampled app session', () => {
    let suppressPropagation = false;
    const appProvider = new BasicTracerProvider({
      sampler: { shouldSample: () => ({ decision: SamplingDecision.NOT_RECORD }) },
    });
    const registration: TracingRegistration = {
      registrationId: 1,
      appName: 'unsampled-app',
      isolate: true,
      configuration: {},
      provider: appProvider,
      state: 'active',
    };
    const routing = new RoutingTracerProvider(() => ({
      registration,
      strategy: 'fallback',
      fallback: true,
      shouldSuppress: () => suppressPropagation,
    }));
    const span = routing
      .getTracer('network')
      .startSpan('GET', { attributes: { 'url.full': 'https://api.example.test/orders' } }, parentContext());
    const propagator = new FaroPausablePropagator(new W3CTraceContextPropagator(), () =>
      routing.shouldSuppressActiveSpan()
    );
    const carrier: Record<string, string> = {};
    const setter = { set: (target: Record<string, string>, key: string, value: string) => (target[key] = value) };

    context.with(trace.setSpan(context.active(), span), () => propagator.inject(context.active(), carrier, setter));

    expect(span.isRecording()).toBe(false);
    expect(carrier['traceparent']).toMatch(/^00-0af7651916cd43dd8448eb211c80319c-[0-9a-f]{16}-00$/);

    suppressPropagation = true;
    const suppressedCarrier: Record<string, string> = {};
    context.with(trace.setSpan(context.active(), span), () =>
      propagator.inject(context.active(), suppressedCarrier, setter)
    );
    expect(suppressedCarrier).toEqual({});
  });
});
