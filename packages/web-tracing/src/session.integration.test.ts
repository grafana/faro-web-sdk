import { SpanKind } from '@opentelemetry/api';
import { BatchSpanProcessor, WebTracerProvider } from '@opentelemetry/sdk-trace-web';

import { initializeFaro, type TraceEvent, TransportItemType } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { SessionInstrumentation } from '../../web-sdk/src/instrumentations/session/instrumentation';
import { SESSION_INACTIVITY_TIME } from '../../web-sdk/src/instrumentations/session/sessionManager';

import { FaroMetaAttributesSpanProcessor } from './faroMetaAttributesSpanProcessor';
import { FaroTraceExporter } from './faroTraceExporter';
import { getSamplingDecision } from './sampler';

it('exports a sampled span and its Faro event under its starting session after expiry into an unsampled session', async () => {
  jest.useFakeTimers();
  window.sessionStorage.clear();
  const transport = new MockTransport();
  const session = new SessionInstrumentation();
  const sdk = initializeFaro(
    mockConfig({
      transports: [transport],
      instrumentations: [session],
      sessionTracking: { enabled: true, persistent: false, samplingRate: 1, session: { id: 'A' } },
    })
  );
  const provider = new WebTracerProvider({
    sampler: { shouldSample: () => ({ decision: getSamplingDecision(sdk.api.getSession()) }) },
    spanProcessors: [
      new FaroMetaAttributesSpanProcessor(new BatchSpanProcessor(new FaroTraceExporter({ api: sdk.api })), sdk.metas),
    ],
  });
  try {
    const span = provider.getTracer('test-request').startSpan('request-in-A', { kind: SpanKind.CLIENT });
    transport.items.length = 0;
    jest.setSystemTime(Date.now() + SESSION_INACTIVITY_TIME + 1);
    sdk.config.sessionTracking!.samplingRate = 0;
    sdk.api.pushEvent('rotate');
    expect(sdk.api.getSession()!.id).not.toBe('A');
    expect(sdk.api.getSession()!.attributes?.['isSampled']).toBe('false');

    span.end();
    await provider.forceFlush();

    const traces = transport.items.filter((item) => item.type === TransportItemType.TRACE);
    expect(traces).toHaveLength(1);
    expect(traces[0]!.meta.session?.id).toBe('A');
    const exported = (traces[0]!.payload as TraceEvent).resourceSpans![0]!.scopeSpans[0]!.spans![0]!;
    expect(exported.attributes).toContainEqual({ key: 'session.id', value: { stringValue: 'A' } });
    const event = transport.items.find((item) => item.type === TransportItemType.EVENT);
    expect(event?.meta.session?.id).toBe('A');
  } finally {
    await provider.shutdown();
    session.destroy();
    jest.useRealTimers();
  }
});

it('partitions a mixed batch by the metadata captured for each span', async () => {
  const transport = new MockTransport();
  const sdk = initializeFaro(mockConfig({ transports: [transport] }));
  sdk.api.setSession({ id: 'A', attributes: { isSampled: 'true' } });
  const provider = new WebTracerProvider({
    spanProcessors: [
      new FaroMetaAttributesSpanProcessor(new BatchSpanProcessor(new FaroTraceExporter({ api: sdk.api })), sdk.metas),
    ],
  });
  try {
    const tracer = provider.getTracer('test');
    const a1 = tracer.startSpan('A-1');
    const a2 = tracer.startSpan('A-2');
    sdk.api.setSession({ id: 'B', attributes: { isSampled: 'true' } });
    const b = tracer.startSpan('B');
    a1.end();
    b.end();
    a2.end();
    sdk.api.setSession({ id: 'after-export-ownership' });

    await provider.forceFlush();

    const traces = transport.items.filter((item) => item.type === TransportItemType.TRACE);
    expect(
      traces.map((item) => ({
        session: item.meta.session?.id,
        spans: (item.payload as TraceEvent).resourceSpans!.flatMap((resource) =>
          resource.scopeSpans.flatMap((scope) => scope.spans!.map((span) => span.name))
        ),
      }))
    ).toEqual([
      { session: 'A', spans: ['A-1', 'A-2'] },
      { session: 'B', spans: ['B'] },
    ]);
  } finally {
    await provider.shutdown();
  }
});

it.each(['generator', 'sampler'])('discards a span submitted by a precommit session %s', async (source) => {
  jest.useFakeTimers();
  window.sessionStorage.clear();
  const transport = new MockTransport();
  const session = new SessionInstrumentation();
  const sdk = initializeFaro(
    mockConfig({
      transports: [transport],
      instrumentations: [session],
      sessionTracking: { enabled: true, persistent: false, samplingRate: 1, session: { id: 'A' } },
    })
  );
  const provider = new WebTracerProvider({
    spanProcessors: [
      new FaroMetaAttributesSpanProcessor(new BatchSpanProcessor(new FaroTraceExporter({ api: sdk.api })), sdk.metas),
    ],
  });
  const warn = jest.spyOn(sdk.internalLogger, 'warn');
  try {
    const tracer = provider.getTracer('test');
    const submit = () => tracer.startSpan('precommit-span').end();
    if (source === 'generator') {
      sdk.config.sessionTracking!.generateSessionId = () => {
        submit();
        return 'B';
      };
    } else {
      sdk.config.sessionTracking!.sampler = () => {
        submit();
        return 1;
      };
    }
    jest.setSystemTime(Date.now() + SESSION_INACTIVITY_TIME + 1);
    sdk.api.pushEvent('rotate');
    await provider.forceFlush();

    expect(transport.items.filter((item) => item.type === TransportItemType.TRACE)).toEqual([]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('session preparation'));

    tracer.startSpan('postcommit-span').end();
    await provider.forceFlush();
    const traces = transport.items.filter((item) => item.type === TransportItemType.TRACE);
    expect(traces).toHaveLength(1);
    expect(traces[0]!.meta.session?.id).toBe(sdk.api.getSession()!.id);
  } finally {
    await provider.shutdown();
    session.destroy();
    warn.mockRestore();
    jest.useRealTimers();
  }
});
