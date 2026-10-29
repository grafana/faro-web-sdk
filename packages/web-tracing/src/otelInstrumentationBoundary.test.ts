import { type Context, context, propagation, trace } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import type { FetchInstrumentation as FetchInstrumentationClass } from '@opentelemetry/instrumentation-fetch';
import type { XMLHttpRequestInstrumentation as XMLHttpRequestInstrumentationClass } from '@opentelemetry/instrumentation-xml-http-request';
import { BasicTracerProvider, SamplingDecision, StackContextManager } from '@opentelemetry/sdk-trace-web';
import type { ReadableSpan, Span as SDKSpan, SpanProcessor } from '@opentelemetry/sdk-trace-web';
import { ATTR_URL_FULL } from '@opentelemetry/semantic-conventions';

import { FaroPausablePropagator } from './faroPausablePropagator';

class StartedSpanProcessor implements SpanProcessor {
  started: Array<{ span: SDKSpan; parentContext: Context }> = [];

  onStart(span: SDKSpan, parentContext: Context): void {
    this.started.push({ span, parentContext });
  }

  onEnd(_span: ReadableSpan): void {}

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}

function unwrap(instrumentation: unknown, target: object, method: string): void {
  (instrumentation as { _unwrap: (target: object, method: string) => void })._unwrap(target, method);
}

type FetchInstrumentationConstructor = typeof FetchInstrumentationClass;
type XMLHttpRequestInstrumentationConstructor = typeof XMLHttpRequestInstrumentationClass;

describe('installed OTel network instrumentation boundary', () => {
  let contextManager: StackContextManager;
  let FetchInstrumentation: FetchInstrumentationConstructor;
  let XMLHttpRequestInstrumentation: XMLHttpRequestInstrumentationConstructor;
  let originalPerformanceObserver: typeof globalThis.PerformanceObserver;
  let originalRequest: typeof globalThis.Request;
  let originalHeaders: typeof globalThis.Headers;

  beforeAll(() => {
    originalPerformanceObserver = globalThis.PerformanceObserver;
    originalRequest = globalThis.Request;
    originalHeaders = globalThis.Headers;
    if (!originalPerformanceObserver) {
      Object.defineProperty(globalThis, 'PerformanceObserver', {
        configurable: true,
        value: class {
          observe(): void {}
          disconnect(): void {}
        },
      });
    }
    if (!originalRequest) {
      Object.defineProperty(globalThis, 'Request', {
        configurable: true,
        value: class {},
      });
    }
    if (!originalHeaders) {
      Object.defineProperty(globalThis, 'Headers', {
        configurable: true,
        value: class {
          private readonly values = new Map<string, string>();

          constructor(init?: Record<string, string>) {
            Object.entries(init ?? {}).forEach(([key, value]) => this.set(key, value));
          }

          set(key: string, value: string): void {
            this.values.set(key.toLowerCase(), value);
          }

          get(key: string): string | null {
            return this.values.get(key.toLowerCase()) ?? null;
          }
        },
      });
    }

    FetchInstrumentation = require('@opentelemetry/instrumentation-fetch').FetchInstrumentation;
    XMLHttpRequestInstrumentation =
      require('@opentelemetry/instrumentation-xml-http-request').XMLHttpRequestInstrumentation;
  });

  afterAll(() => {
    if (originalPerformanceObserver) {
      Object.defineProperty(globalThis, 'PerformanceObserver', {
        configurable: true,
        value: originalPerformanceObserver,
      });
    } else {
      delete (globalThis as { PerformanceObserver?: typeof PerformanceObserver }).PerformanceObserver;
    }

    if (originalRequest) {
      Object.defineProperty(globalThis, 'Request', { configurable: true, value: originalRequest });
    } else {
      delete (globalThis as { Request?: typeof Request }).Request;
    }

    if (originalHeaders) {
      Object.defineProperty(globalThis, 'Headers', { configurable: true, value: originalHeaders });
    } else {
      delete (globalThis as { Headers?: typeof Headers }).Headers;
    }
  });

  beforeEach(() => {
    context.disable();
    contextManager = new StackContextManager();
    context.setGlobalContextManager(contextManager.enable());
  });

  afterEach(() => {
    contextManager.disable();
    context.disable();
    jest.useRealTimers();
  });

  it('exposes fetch url.full at span start and keeps manual spans distinguishable', async () => {
    jest.useFakeTimers();

    const processor = new StartedSpanProcessor();
    const provider = new BasicTracerProvider({ spanProcessors: [processor] });
    const tracer = provider.getTracer('boundary-test');
    const instrumentation = new FetchInstrumentation({ enabled: false });
    const originalFetch = globalThis.fetch;
    const requestUrl = 'https://api.example.test/orders?item=1';
    const response = {
      status: 200,
      url: requestUrl,
      clone: () => ({ body: null }),
    } as unknown as Response;

    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: jest.fn(() => Promise.resolve(response)),
    });

    try {
      instrumentation.setTracerProvider(provider);
      instrumentation.enable();

      const parent = tracer.startSpan('parent');
      await context.with(trace.setSpan(context.active(), parent), () => fetch(requestUrl));

      const network = processor.started.find(({ span }) => span.name === 'GET');
      expect(network).toBeDefined();
      expect(network!.span.attributes[ATTR_URL_FULL]).toBe(requestUrl);
      expect(trace.getSpan(network!.parentContext)).toBe(parent);

      const manual = tracer.startSpan('manual');
      manual.end();
      const manualStart = processor.started.find(({ span }) => span.name === 'manual');
      expect(manualStart).toBeDefined();
      expect(manualStart!.span.attributes[ATTR_URL_FULL]).toBeUndefined();

      parent.end();
      jest.runOnlyPendingTimers();
    } finally {
      instrumentation.disable();
      unwrap(instrumentation, globalThis, 'fetch');
      Object.defineProperty(globalThis, 'fetch', {
        configurable: true,
        writable: true,
        value: originalFetch,
      });
    }
  });

  it('lets excluded and paused fetches reach native networking without Faro capture or headers', async () => {
    jest.useFakeTimers();

    let paused = false;
    const processor = new StartedSpanProcessor();
    const provider = new BasicTracerProvider({
      sampler: {
        shouldSample: () => ({
          decision: paused ? SamplingDecision.NOT_RECORD : SamplingDecision.RECORD_AND_SAMPLED,
        }),
        toString: () => 'test-pause-sampler',
      },
      spanProcessors: [processor],
    });
    const instrumentation = new FetchInstrumentation({
      enabled: false,
      ignoreUrls: ['https://collector.example.test/'],
      propagateTraceHeaderCorsUrls: ['https://api.example.test/'],
    });
    const originalFetch = globalThis.fetch;
    const excludedUrl = 'https://collector.example.test/';
    const pausedUrl = 'https://api.example.test/';
    const response = {
      status: 200,
      url: pausedUrl,
      clone: () => ({ body: null }),
    } as unknown as Response;
    const nativeFetch = jest.fn(() => Promise.resolve(response));

    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: nativeFetch,
    });
    propagation.setGlobalPropagator(new FaroPausablePropagator(new W3CTraceContextPropagator(), () => paused));

    try {
      instrumentation.setTracerProvider(provider);
      instrumentation.enable();

      const excludedOptions: RequestInit = {};
      await fetch(excludedUrl, excludedOptions);
      expect(nativeFetch).toHaveBeenCalledWith(excludedUrl, excludedOptions);
      expect(excludedOptions.headers).toBeUndefined();
      expect(processor.started).toHaveLength(0);

      paused = true;
      const pausedOptions: RequestInit = {};
      await fetch(pausedUrl, pausedOptions);
      expect(nativeFetch).toHaveBeenCalledWith(pausedUrl, pausedOptions);
      expect((pausedOptions.headers as Headers).get('traceparent')).toBeNull();
      expect(processor.started).toHaveLength(0);
      expect(nativeFetch).toHaveBeenCalledTimes(2);

      jest.runOnlyPendingTimers();
    } finally {
      instrumentation.disable();
      unwrap(instrumentation, globalThis, 'fetch');
      Object.defineProperty(globalThis, 'fetch', {
        configurable: true,
        writable: true,
        value: originalFetch,
      });
      propagation.disable();
    }
  });

  it('lets excluded and paused XHRs reach native networking without Faro capture or headers', () => {
    let paused = false;
    const processor = new StartedSpanProcessor();
    const provider = new BasicTracerProvider({
      sampler: {
        shouldSample: () => ({
          decision: paused ? SamplingDecision.NOT_RECORD : SamplingDecision.RECORD_AND_SAMPLED,
        }),
        toString: () => 'test-pause-sampler',
      },
      spanProcessors: [processor],
    });
    const instrumentation = new XMLHttpRequestInstrumentation({
      enabled: false,
      ignoreUrls: ['https://collector.example.test/'],
      propagateTraceHeaderCorsUrls: ['https://api.example.test/'],
    });
    const excludedUrl = 'https://collector.example.test/';
    const pausedUrl = 'https://api.example.test/';
    const nativeSend = jest.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(() => {});
    const setRequestHeader = jest.spyOn(XMLHttpRequest.prototype, 'setRequestHeader').mockImplementation(() => {});

    propagation.setGlobalPropagator(new FaroPausablePropagator(new W3CTraceContextPropagator(), () => paused));

    try {
      instrumentation.setTracerProvider(provider);
      instrumentation.enable();

      const excludedXhr = new XMLHttpRequest();
      excludedXhr.open('GET', excludedUrl);
      excludedXhr.send();
      expect(nativeSend).toHaveBeenCalledTimes(1);
      expect(setRequestHeader).not.toHaveBeenCalled();
      expect(processor.started).toHaveLength(0);

      paused = true;
      const pausedXhr = new XMLHttpRequest();
      pausedXhr.open('GET', pausedUrl);
      pausedXhr.send();
      expect(nativeSend).toHaveBeenCalledTimes(2);
      expect(setRequestHeader).not.toHaveBeenCalled();
      expect(processor.started).toHaveLength(0);
    } finally {
      instrumentation.disable();
      unwrap(instrumentation, XMLHttpRequest.prototype, 'open');
      unwrap(instrumentation, XMLHttpRequest.prototype, 'send');
      nativeSend.mockRestore();
      setRequestHeader.mockRestore();
      propagation.disable();
    }
  });

  it('records why XHR disable must wait for pending requests to drain', () => {
    const processor = new StartedSpanProcessor();
    const provider = new BasicTracerProvider({ spanProcessors: [processor] });
    const instrumentation = new XMLHttpRequestInstrumentation({ enabled: false });

    try {
      instrumentation.setTracerProvider(provider);
      instrumentation.enable();

      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/pending');
      expect(
        (instrumentation as unknown as { _xhrMem: WeakMap<XMLHttpRequest, unknown> })._xhrMem.get(xhr)
      ).toBeDefined();

      instrumentation.disable();

      // OTel's disable() resets the tracking map, so calling it while the request is pending loses
      // the span. The capture controller must gate new requests and delay disable until this map is clear.
      expect(
        (instrumentation as unknown as { _xhrMem: WeakMap<XMLHttpRequest, unknown> })._xhrMem.get(xhr)
      ).toBeUndefined();
    } finally {
      instrumentation.disable();
      unwrap(instrumentation, XMLHttpRequest.prototype, 'open');
      unwrap(instrumentation, XMLHttpRequest.prototype, 'send');
    }
  });

  it('exposes xhr url.full when open creates the span and preserves the active parent', () => {
    const processor = new StartedSpanProcessor();
    const provider = new BasicTracerProvider({ spanProcessors: [processor] });
    const tracer = provider.getTracer('boundary-test');
    const instrumentation = new XMLHttpRequestInstrumentation({ enabled: false });
    const requestUrl = '/api/orders?item=1';

    try {
      instrumentation.setTracerProvider(provider);
      instrumentation.enable();

      const parent = tracer.startSpan('parent');
      const xhr = new XMLHttpRequest();
      context.with(trace.setSpan(context.active(), parent), () => xhr.open('GET', requestUrl));

      const network = processor.started.find(({ span }) => span.name === 'GET');
      expect(network).toBeDefined();
      expect(network!.span.attributes[ATTR_URL_FULL]).toBe(new URL(requestUrl, document.baseURI).toString());
      expect(trace.getSpan(network!.parentContext)).toBe(parent);

      parent.end();
    } finally {
      instrumentation.disable();
      unwrap(instrumentation, XMLHttpRequest.prototype, 'open');
      unwrap(instrumentation, XMLHttpRequest.prototype, 'send');
    }
  });
});
