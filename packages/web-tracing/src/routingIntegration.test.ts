import { context, trace } from '@opentelemetry/api';
import type { WebTracerProvider } from '@opentelemetry/sdk-trace-web';

import type { API, Config, InternalLogger, Metas, Transports } from '@grafana/faro-web-sdk';

import type { TracingInstrumentation as TracingInstrumentationType } from './instrumentation';
import { getTracingRegistry, resetTracingRegistryForTests } from './tracingRegistry';

const hadPerformanceObserver = Boolean(globalThis.PerformanceObserver);
const originalRequest = globalThis.Request;
const originalHeaders = globalThis.Headers;
if (!hadPerformanceObserver) {
  Object.defineProperty(globalThis, 'PerformanceObserver', {
    configurable: true,
    value: class {
      observe(): void {}
      disconnect(): void {}
      takeRecords(): PerformanceEntryList {
        return [] as unknown as PerformanceEntryList;
      }
    },
  });
}
if (!originalRequest) {
  Object.defineProperty(globalThis, 'Request', { configurable: true, value: class {} });
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

const { TracingInstrumentation } = require('./instrumentation') as typeof import('./instrumentation');

function setupApp(
  appName: string,
  pageRoute: string,
  api: API,
  ignoreUrls: Array<string | RegExp> = []
): TracingInstrumentationType {
  const instrumentation = new TracingInstrumentation({
    mode: 'routing',
    drainTimeoutMs: 0,
    pageRouteMatchers: [{ pattern: pageRoute, target: 'pathname' }],
  });
  Object.assign(instrumentation, {
    api,
    internalLogger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as InternalLogger,
    config: {
      app: { name: appName },
      isolate: true,
      ignoreUrls,
    } as unknown as Config,
    metas: { value: { browser: {}, session: { attributes: { isSampled: 'true' } } } } as unknown as Metas,
    transports: { transports: [], isPaused: () => false } as unknown as Transports,
  });
  return instrumentation;
}

function api(): API {
  return {
    initOTEL: jest.fn(),
    getSession: jest.fn(() => ({ attributes: { isSampled: 'true' } })),
    pushTraces: jest.fn(),
    pushEvent: jest.fn(),
    getActiveUserAction: jest.fn(),
  } as unknown as API;
}

describe('routing network integration', () => {
  const originalFetch = globalThis.fetch;

  afterAll(() => {
    if (!hadPerformanceObserver) {
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

  afterEach(() => {
    trace.disable();
    context.disable();
    resetTracingRegistryForTests();
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: originalFetch,
    });
    jest.useRealTimers();
  });

  it('bypasses upstream capture for a resolved app exclusion', async () => {
    const app = api();
    const instrumentation = setupApp('app-b', '/b', app, ['https://api.example.test/private']);
    const response = { status: 200, url: 'https://api.example.test/private' } as unknown as Response;
    const nativeFetch = jest.fn(() => Promise.resolve(response));
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: nativeFetch,
    });
    window.history.pushState({}, '', '/b');

    try {
      instrumentation.initialize();
      await fetch(response.url);
      const registration = getTracingRegistry()!.registrations[0];
      await (registration!.provider as WebTracerProvider).forceFlush();

      expect(nativeFetch).toHaveBeenCalledTimes(1);
      expect(app.pushTraces).not.toHaveBeenCalled();
    } finally {
      instrumentation.destroy();
    }
  });

  it('creates one routed span for the page-route owner and preserves the parent trace', async () => {
    jest.useFakeTimers();
    const appA = api();
    const appB = api();
    const first = setupApp('app-a', '/a', appA);
    const second = setupApp('app-b', '/b', appB);
    const response = {
      status: 200,
      url: 'https://api.example.test/orders',
      clone: () => ({ body: null }),
    } as unknown as Response;
    const nativeFetch = jest.fn(() => Promise.resolve(response));
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: nativeFetch,
    });
    window.history.pushState({}, '', '/b');

    try {
      first.initialize();
      second.initialize();

      const parent = trace.getTracer('integration').startSpan('parent');
      await context.with(trace.setSpan(context.active(), parent), () => fetch(response.url));
      const manual = trace.getTracer('manual').startSpan('manual', {
        attributes: { 'url.full': response.url },
      });
      manual.end();
      parent.end();
      jest.runOnlyPendingTimers();

      const registrations = getTracingRegistry()!.registrations;
      await Promise.all(registrations.map((registration) => (registration.provider as WebTracerProvider).forceFlush()));

      expect(nativeFetch).toHaveBeenCalledTimes(1);
      expect(appA.pushTraces).toHaveBeenCalledTimes(1);
      expect(appB.pushTraces).toHaveBeenCalledTimes(1);

      const aTrace = (appA.pushTraces as jest.Mock).mock.calls[0][0];
      const bTrace = (appB.pushTraces as jest.Mock).mock.calls[0][0];
      const aSpans = aTrace.resourceSpans.flatMap((resourceSpan: { scopeSpans: Array<{ spans: unknown[] }> }) =>
        resourceSpan.scopeSpans.flatMap((scopeSpan) => scopeSpan.spans)
      ) as Array<{ name: string; traceId: string; attributes: Array<{ key: string }> }>;
      const bSpans = bTrace.resourceSpans.flatMap((resourceSpan: { scopeSpans: Array<{ spans: unknown[] }> }) =>
        resourceSpan.scopeSpans.flatMap((scopeSpan) => scopeSpan.spans)
      ) as Array<{ name: string; traceId: string; attributes: Array<{ key: string }> }>;
      const bSpan = bSpans.find((span) =>
        span.attributes.some((attribute) => attribute.key === 'faro.attribution.strategy')
      );
      const aSpan = aSpans.find((span: { name: string }) => span.name === 'parent');
      const manualSpan = aSpans.find((span: { name: string }) => span.name === 'manual');
      expect(bSpan).toBeDefined();
      expect(aSpan).toBeDefined();
      expect(manualSpan).toBeDefined();

      expect(aTrace.resourceSpans[0].resource.attributes).toEqual(
        expect.arrayContaining([expect.objectContaining({ key: 'service.name', value: { stringValue: 'app-a' } })])
      );
      expect(bTrace.resourceSpans[0].resource.attributes).toEqual(
        expect.arrayContaining([expect.objectContaining({ key: 'service.name', value: { stringValue: 'app-b' } })])
      );
      expect(bSpan!.traceId).toBe(aSpan!.traceId);
      expect(manualSpan!.attributes).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ key: 'faro.attribution.strategy' })])
      );
      expect(bSpan!.attributes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'faro.attribution.strategy', value: { stringValue: 'page-route' } }),
          expect.objectContaining({ key: 'faro.attribution.fallback', value: { boolValue: false } }),
        ])
      );
    } finally {
      first.destroy();
      second.destroy();
    }
  });
});
