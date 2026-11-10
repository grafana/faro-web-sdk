import { context, trace } from '@opentelemetry/api';
import type { FetchInstrumentation as FetchInstrumentationType } from '@opentelemetry/instrumentation-fetch';
import type { WebTracerProvider } from '@opentelemetry/sdk-trace-web';

import type { API, Config, InternalLogger, Metas, Transports } from '@grafana/faro-web-sdk';

import type { TracingInstrumentation as TracingInstrumentationType } from './instrumentation';
import { resetTracingOwnerForTests } from './tracingOwner';
import { getTracingRegistry } from './tracingRegistry';

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

const { FetchInstrumentation } =
  require('@opentelemetry/instrumentation-fetch') as typeof import('@opentelemetry/instrumentation-fetch');
const { TracingInstrumentation } = require('./instrumentation') as typeof import('./instrumentation');

function setupApp(
  appName: string,
  pageRoute: string,
  api: API,
  ignoreUrls: Array<string | RegExp> = [],
  drainTimeoutMs = 0,
  apiUrl?: string
): TracingInstrumentationType {
  const instrumentation = new TracingInstrumentation({
    mode: 'routing',
    drainTimeoutMs,
    apiUrlMatchers: apiUrl ? [{ pattern: apiUrl, target: 'full-url' }] : undefined,
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
    resetTracingOwnerForTests();
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

  it('resolves relative fetch URLs against document.baseURI before capture suppression', async () => {
    jest.useFakeTimers();
    const app = api();
    const requestUrl = `${window.location.origin}/api/orders`;
    const instrumentation = setupApp('app-b', '/b', app, [requestUrl]);
    const nativeFetch = jest.fn(() => Promise.resolve({ status: 200, url: requestUrl } as Response));
    window.history.pushState({}, '', '/b');
    const base = document.createElement('base');
    base.href = `${window.location.origin}/api/`;
    document.head.appendChild(base);
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: nativeFetch,
    });

    try {
      instrumentation.initialize();
      const registry = getTracingRegistry()!;
      const captureProvider = registry.captureProvider as unknown as {
        shouldBypassNetworkRequest: (url: string, scope: string) => boolean;
      };
      const shouldBypass = jest.spyOn(captureProvider, 'shouldBypassNetworkRequest');

      await fetch('orders');

      expect(shouldBypass).toHaveBeenCalledWith(requestUrl, '@opentelemetry/instrumentation-fetch');
      // Suppressed requests reach native fetch with their original relative input, without entering OTel.
      expect(nativeFetch).toHaveBeenCalledWith('orders');
      expect((registry.captureInstrumentations![0] as unknown as { _tasksCount: number })._tasksCount).toBe(0);
      expect(app.pushTraces).not.toHaveBeenCalled();
    } finally {
      instrumentation.destroy();
      base.remove();
      jest.runOnlyPendingTimers();
    }
  });

  it('suppresses collector spans from another instrumentation using the shared provider', async () => {
    jest.useFakeTimers();
    const app = api();
    const collectorUrl = `${window.location.origin}/collect/collector-id`;
    const instrumentation = setupApp('app-a', '/a', app);
    Object.assign(instrumentation, {
      transports: {
        transports: [{ getIgnoreUrls: () => [collectorUrl] }],
        isPaused: () => false,
      } as unknown as Transports,
    });
    const response = {
      status: 200,
      url: collectorUrl,
      clone: () => ({ body: null }),
    } as unknown as Response;
    const nativeFetch = jest.fn(() => Promise.resolve(response));
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: nativeFetch,
    });
    window.history.pushState({}, '', '/a');
    let legacyInstrumentation: FetchInstrumentationType | undefined;

    try {
      instrumentation.initialize();
      const registry = getTracingRegistry()!;
      expect(registry.collectorIgnoreUrls).toContain(collectorUrl);

      const oldSemconvSpan = registry
        .captureProvider!.getTracer('@opentelemetry/instrumentation-fetch')
        .startSpan('POST', { attributes: { 'http.url': collectorUrl } });
      expect(oldSemconvSpan.isRecording()).toBe(false);
      oldSemconvSpan.end();

      // This instrumentation is registered after Faro's wrappers and has no Faro-specific ignoreUrls.
      legacyInstrumentation = new FetchInstrumentation();
      legacyInstrumentation.enable();
      await fetch(collectorUrl, { method: 'POST' });
      jest.runOnlyPendingTimers();

      const registration = getTracingRegistry()!.registrations[0]!;
      await (registration.provider as WebTracerProvider).forceFlush();

      expect(nativeFetch).toHaveBeenCalledTimes(1);
      expect(app.pushTraces).not.toHaveBeenCalled();
      expect(app.pushEvent).not.toHaveBeenCalled();
    } finally {
      legacyInstrumentation?.disable();
      instrumentation.destroy();
      jest.runOnlyPendingTimers();
    }
  });

  it("keeps a draining app's XHR tracked until its load event completes", async () => {
    jest.useFakeTimers();
    const appA = api();
    const appB = api();
    const requestA = 'https://api.example.test/app-a';
    const requestB = 'https://api.example.test/app-b';
    const first = setupApp('app-a', '/a', appA, [], 30_000, requestA);
    const second = setupApp('app-b', '/b', appB, [], 30_000, requestB);
    const nativeSend = jest.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(() => {});
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: jest.fn(() => Promise.resolve({ status: 200, url: requestA } as Response)),
    });
    window.history.pushState({}, '', '/b');

    try {
      first.initialize();
      second.initialize();

      const xhrA = new XMLHttpRequest();
      xhrA.open('GET', requestA);
      xhrA.send();
      const xhrB = new XMLHttpRequest();
      xhrB.open('GET', requestB);
      xhrB.send();

      const xhrInstrumentation = getTracingRegistry()!.captureInstrumentations![1] as unknown as {
        _xhrMem: WeakMap<XMLHttpRequest, unknown>;
      };
      expect(xhrInstrumentation._xhrMem.get(xhrB)).toBeDefined();

      first.destroy();
      second.destroy();

      xhrA.dispatchEvent(new Event('load'));
      await jest.advanceTimersByTimeAsync(300);

      // Completing app A's drain must not disable the shared XHR instrumentation while app B's
      // request is still draining; upstream disable() clears this private tracking map.
      expect(xhrInstrumentation._xhrMem.get(xhrB)).toBeDefined();
      expect(getTracingRegistry()?.registrations.map(({ state }) => state)).toEqual(['draining']);

      xhrB.dispatchEvent(new Event('load'));
      await jest.advanceTimersByTimeAsync(300);

      expect(appA.pushTraces).toHaveBeenCalledTimes(1);
      expect(appB.pushTraces).toHaveBeenCalledTimes(1);
      expect(getTracingRegistry()?.registrations).toHaveLength(0);
    } finally {
      first.destroy();
      second.destroy();
      const xhrInstrumentation = getTracingRegistry()?.captureInstrumentations?.[1] as
        { disable: () => void } | undefined;
      xhrInstrumentation?.disable();
      nativeSend.mockRestore();
    }
  });

  it('routes getTracer spans by the current page route at each startSpan call', async () => {
    jest.useFakeTimers();
    const appA = api();
    const appB = api();
    const first = setupApp('app-a', '/a', appA);
    const second = setupApp('app-b', '/b', appB);
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: jest.fn(() => Promise.resolve({ status: 200, url: 'https://api.example.test/orders' } as Response)),
    });
    window.history.pushState({}, '', '/b');

    try {
      first.initialize();
      second.initialize();

      const tracer = second.getTracer('manual-navigation');
      const parent = tracer.startSpan('parent-on-b');
      window.history.pushState({}, '', '/a');
      const child = context.with(trace.setSpan(context.active(), parent), () => tracer.startSpan('child-on-a'));
      child.end();
      parent.end();

      const registrations = getTracingRegistry()!.registrations;
      const providerA = registrations.find(({ appName }) => appName === 'app-a')!.provider as WebTracerProvider;
      const providerB = registrations.find(({ appName }) => appName === 'app-b')!.provider as WebTracerProvider;
      await Promise.all([providerA.forceFlush(), providerB.forceFlush()]);

      const readSpans = (faro: API) =>
        (faro.pushTraces as jest.Mock).mock.calls.flatMap(([batch]) =>
          batch.resourceSpans.flatMap(
            (resourceSpan: { scopeSpans: Array<{ spans: Array<Record<string, unknown>> }> }) =>
              resourceSpan.scopeSpans.flatMap((scopeSpan: { spans: Array<Record<string, unknown>> }) => scopeSpan.spans)
          )
        ) as Array<{ name: string; traceId: string; attributes: Array<{ key: string; value: unknown }> }>;
      const aSpans = readSpans(appA);
      const bSpans = readSpans(appB);
      const parentSpan = bSpans.find(({ name }) => name === 'parent-on-b');
      const childSpan = aSpans.find(({ name }) => name === 'child-on-a');

      expect(parentSpan).toBeDefined();
      expect(childSpan).toBeDefined();
      expect(aSpans.some(({ name }) => name === 'parent-on-b')).toBe(false);
      expect(bSpans.some(({ name }) => name === 'child-on-a')).toBe(false);
      expect(childSpan!.traceId).toBe(parentSpan!.traceId);
      expect(parentSpan!.attributes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'faro.attribution.strategy', value: { stringValue: 'page-route' } }),
          expect.objectContaining({ key: 'faro.attribution.fallback', value: { boolValue: false } }),
        ])
      );
      expect(childSpan!.attributes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'faro.attribution.strategy', value: { stringValue: 'page-route' } }),
          expect.objectContaining({ key: 'faro.attribution.fallback', value: { boolValue: false } }),
        ])
      );
    } finally {
      first.destroy();
      second.destroy();
      jest.runOnlyPendingTimers();
    }
  });

  it('keeps an XHR CORS preflight with its request owner when it starts during drain', async () => {
    jest.useFakeTimers();
    const appA = api();
    const appB = api();
    const requestUrl = 'https://api.example.test/app-b';
    const first = setupApp('app-a', '/a', appA);
    const second = setupApp('app-b', '/b', appB, [], 30_000, requestUrl);
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: jest.fn(() => Promise.resolve({ status: 200, url: requestUrl } as Response)),
    });
    window.history.pushState({}, '', '/b');

    try {
      first.initialize();
      second.initialize();

      const requestTracer = trace.getTracer('@opentelemetry/instrumentation-xml-http-request');
      const requestSpan = requestTracer.startSpan('GET', { attributes: { 'url.full': requestUrl } });
      second.destroy();

      const corsSpan = context.with(trace.setSpan(context.active(), requestSpan), () =>
        requestTracer.startSpan('CORS Preflight')
      );
      corsSpan.end();
      requestSpan.end();

      const registrations = getTracingRegistry()!.registrations;
      const providerA = registrations.find(({ appName }) => appName === 'app-a')!.provider as WebTracerProvider;
      const providerB = registrations.find(({ appName }) => appName === 'app-b')!.provider as WebTracerProvider;
      await Promise.all([providerA.forceFlush(), providerB.forceFlush()]);

      const bSpans = (appB.pushTraces as jest.Mock).mock.calls.flatMap(([batch]) =>
        batch.resourceSpans.flatMap((resourceSpan: { scopeSpans: Array<{ spans: Array<{ name: string }> }> }) =>
          resourceSpan.scopeSpans.flatMap((scopeSpan: { spans: Array<{ name: string }> }) => scopeSpan.spans)
        )
      ) as Array<{ name: string }>;

      expect(bSpans.map(({ name }) => name)).toEqual(expect.arrayContaining(['GET', 'CORS Preflight']));
      expect(appA.pushTraces).not.toHaveBeenCalled();
    } finally {
      first.destroy();
      second.destroy();
      jest.runOnlyPendingTimers();
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
