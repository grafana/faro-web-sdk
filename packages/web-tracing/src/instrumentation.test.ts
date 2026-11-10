import { trace } from '@opentelemetry/api';
import type { Span } from '@opentelemetry/api';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import type { FetchRequestHookFunction } from '@opentelemetry/instrumentation-fetch';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';

import { UserActionState } from '@grafana/faro-web-sdk';
import type { API, Config, InternalLogger, Metas, Transports } from '@grafana/faro-web-sdk';

import { TracingInstrumentation } from './instrumentation';
import {
  addPropagateTraceHeaderCorsUrls,
  claimTracingOwner,
  getTracingOwner,
  resetTracingOwnerForTests,
} from './tracingOwner';
import { getFallbackTracingRegistration, getTracingRegistry } from './tracingRegistry';
import type { TracingInstrumentationOptions } from './types';

jest.mock('@opentelemetry/instrumentation', () => ({
  ...jest.requireActual('@opentelemetry/instrumentation'),
  registerInstrumentations: jest.fn(),
}));

function setupInstrumentation(appName: string, options: TracingInstrumentationOptions = {}) {
  const api = {
    initOTEL: jest.fn(),
    getSession: jest.fn(() => ({})),
    pushTraces: jest.fn(),
    getActiveUserAction: jest.fn(),
  } as unknown as API;

  const internalLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as InternalLogger;

  const instrumentation = new TracingInstrumentation(options);
  Object.assign(instrumentation, {
    api,
    internalLogger,
    config: { app: { name: appName } } as Config,
    metas: { value: { browser: {} } } as unknown as Metas,
    transports: { transports: [], isPaused: () => false } as unknown as Transports,
  });

  return { instrumentation, api, internalLogger };
}

describe('TracingInstrumentation single-owner behavior', () => {
  let registerSpy: jest.SpyInstance;

  beforeEach(() => {
    registerSpy = jest.spyOn(WebTracerProvider.prototype, 'register').mockImplementation(() => {});
  });

  afterEach(() => {
    resetTracingOwnerForTests();
    trace.disable();
    jest.clearAllMocks();
    registerSpy.mockRestore();
  });

  it('registers the provider and instrumentations for the first (owning) instance', () => {
    const { instrumentation, api } = setupInstrumentation('app-a');

    instrumentation.initialize();

    expect(registerSpy).toHaveBeenCalledTimes(1);
    expect(registerInstrumentations).toHaveBeenCalledTimes(1);
    expect(api.initOTEL).toHaveBeenCalledTimes(1);
  });

  it('keeps legacy custom instrumentations unchanged when routing is omitted', () => {
    const customInstrumentation = { name: 'custom' };
    const { instrumentation } = setupInstrumentation('legacy-app', {
      instrumentations: [customInstrumentation as never],
    });

    instrumentation.initialize();

    expect((registerInstrumentations as jest.Mock).mock.calls[0]?.[0].instrumentations).toEqual([
      customInstrumentation,
    ]);
  });

  it('does not re-register for a second instance and warns instead', () => {
    const first = setupInstrumentation('app-a');
    first.instrumentation.initialize();

    jest.clearAllMocks();

    const second = setupInstrumentation('app-b');
    second.instrumentation.initialize();

    expect(registerSpy).not.toHaveBeenCalled();
    expect(registerInstrumentations).not.toHaveBeenCalled();
    // manual tracing must still work against the shared provider
    expect(second.api.initOTEL).toHaveBeenCalledTimes(1);
    expect(second.internalLogger.warn).toHaveBeenCalledTimes(1);
    expect((second.internalLogger.warn as jest.Mock).mock.calls[0].join(' ')).toContain('app-a');
  });

  it('unions propagateTraceHeaderCorsUrls from later instances into the owner', () => {
    const owner = setupInstrumentation('app-a', {
      instrumentationOptions: { propagateTraceHeaderCorsUrls: ['https://a.example.com'] },
    });
    owner.instrumentation.initialize();

    const child = setupInstrumentation('app-b', {
      instrumentationOptions: { propagateTraceHeaderCorsUrls: ['https://b.example.com'] },
    });
    child.instrumentation.initialize();

    // The owner registered with the shared array; the child's URL is appended to the same array,
    // which OTel reads live, so the owner keeps propagating headers for the child's URLs too.
    expect(getTracingOwner()?.propagateTraceHeaderCorsUrls).toEqual(['https://a.example.com', 'https://b.example.com']);
  });

  it('behaves identically for a lone instance (regression)', () => {
    const { instrumentation, api } = setupInstrumentation('only-app');

    instrumentation.initialize();

    expect(registerSpy).toHaveBeenCalledTimes(1);
    expect(registerInstrumentations).toHaveBeenCalledTimes(1);
    expect(api.initOTEL).toHaveBeenCalledTimes(1);
  });

  it('preserves legacy owner propagation URLs through routing registry refreshes', () => {
    const first = setupInstrumentation('app-a', {
      mode: 'routing',
      drainTimeoutMs: 0,
      instrumentationOptions: { propagateTraceHeaderCorsUrls: ['https://routing-a.example.test'] },
    });
    first.instrumentation.initialize();

    const registry = getTracingRegistry()!;
    const ownerUrls = getTracingOwner()!.propagateTraceHeaderCorsUrls;
    const fetchInstrumentation = registry.captureInstrumentations![0] as unknown as {
      getConfig: () => { propagateTraceHeaderCorsUrls: Array<string | RegExp> };
    };
    expect(registry.propagateTraceHeaderCorsUrls).toBe(ownerUrls);
    expect(fetchInstrumentation.getConfig().propagateTraceHeaderCorsUrls).toBe(ownerUrls);

    // Simulate a separately bundled legacy Faro version appending to the owner contract after
    // routing capture has already been installed.
    addPropagateTraceHeaderCorsUrls(['https://legacy.example.test']);

    const second = setupInstrumentation('app-b', {
      mode: 'routing',
      drainTimeoutMs: 0,
      instrumentationOptions: { propagateTraceHeaderCorsUrls: ['https://routing-b.example.test'] },
    });
    second.instrumentation.initialize();

    expect(ownerUrls).toEqual([
      'https://legacy.example.test',
      'https://routing-a.example.test',
      'https://routing-b.example.test',
    ]);

    first.instrumentation.destroy();
    expect(ownerUrls).toEqual(['https://legacy.example.test', 'https://routing-b.example.test']);
    second.instrumentation.destroy();
    expect(ownerUrls).toEqual(['https://legacy.example.test']);
  });

  it('registers each routing instance in the shared registry before capture integration', () => {
    const first = setupInstrumentation('app-a', { mode: 'routing' });
    first.instrumentation.initialize();

    const second = setupInstrumentation('app-a', { mode: 'routing' });
    second.instrumentation.initialize();

    expect(getTracingRegistry()?.registrations).toHaveLength(2);
    expect(
      getTracingRegistry()?.registrations.map(({ registrationId, appName }) => ({ registrationId, appName }))
    ).toEqual([
      { registrationId: 0, appName: 'app-a' },
      { registrationId: 1, appName: 'app-a' },
    ]);
    expect(getTracingRegistry()?.registrations.every(({ provider }) => provider)).toBe(true);
    expect(getTracingRegistry()?.captureProvider).toBeDefined();
    expect(registerInstrumentations).toHaveBeenCalledTimes(1);
    expect(getTracingOwner()?.appName).toBe('app-a');
    expect(claimTracingOwner('legacy-2.13-app')).toBe(false);

    first.instrumentation.destroy();

    expect(getTracingRegistry()?.registrations[0]?.state).toBe('draining');
    expect(getFallbackTracingRegistration()?.registrationId).toBe(1);
    expect(getTracingRegistry()?.captureProvider).toBeDefined();
  });

  it('provides an explicit per-app tracer for manually attributed spans', () => {
    const first = setupInstrumentation('app-a', { mode: 'routing' });
    first.instrumentation.initialize();
    const second = setupInstrumentation('app-b', { mode: 'routing' });
    second.instrumentation.initialize();

    const registrations = getTracingRegistry()?.registrations ?? [];
    const firstProvider = registrations[0]?.provider!;
    const secondProvider = registrations[1]?.provider!;
    const firstGetTracer = jest.spyOn(firstProvider, 'getTracer');
    const secondGetTracer = jest.spyOn(secondProvider, 'getTracer');

    const span = second.instrumentation.getTracer('manual-checkout').startSpan('checkout');

    expect(secondGetTracer).toHaveBeenCalledWith('manual-checkout', undefined, undefined);
    expect(firstGetTracer).not.toHaveBeenCalled();
    span.end();
  });

  it('keeps generated collector exclusions page-wide while filtering app-only ignores', () => {
    const appIgnore = 'https://app.example.test/private';
    const generatedCollector = /\/collect(?:\/[\w]*)?$/;
    const { instrumentation } = setupInstrumentation('app-a', { mode: 'routing' });
    Object.assign(instrumentation, {
      config: { app: { name: 'app-a' }, isolate: true, ignoreUrls: [appIgnore, generatedCollector] } as Config,
      transports: {
        transports: [
          {
            getIgnoreUrls: () => ['https://collector.example.test/collect', appIgnore, generatedCollector],
          },
        ],
        isPaused: () => false,
      } as unknown as Transports,
    });

    instrumentation.initialize();

    expect(getTracingRegistry()?.collectorIgnoreUrls).toEqual([
      'https://collector.example.test/collect',
      generatedCollector,
    ]);
  });

  it('dispatches network callbacks to the resolved app only', () => {
    const firstHook = jest.fn();
    const secondHook = jest.fn();
    const first = setupInstrumentation('app-a', {
      mode: 'routing',
      apiUrlMatchers: [{ pattern: 'https://api.example.test/a', target: 'full-url' }],
      instrumentationOptions: { fetchInstrumentationOptions: { requestHook: firstHook } },
    });
    first.instrumentation.initialize();

    const second = setupInstrumentation('app-b', {
      mode: 'routing',
      apiUrlMatchers: [{ pattern: 'https://api.example.test/b', target: 'full-url' }],
      instrumentationOptions: { fetchInstrumentationOptions: { requestHook: secondHook } },
    });
    second.instrumentation.initialize();

    const fetchInstrumentation = getTracingRegistry()?.captureInstrumentations?.[0];
    const requestHook = (
      fetchInstrumentation as unknown as {
        getConfig: () => {
          requestHook: (span: Span, request: Request | RequestInit) => void;
        };
      }
    ).getConfig().requestHook as FetchRequestHookFunction;
    const span = getTracingRegistry()!
      .captureProvider!.getTracer('@opentelemetry/instrumentation-fetch')
      .startSpan('GET', { attributes: { 'url.full': 'https://api.example.test/b' } });

    requestHook(span, {});

    expect(firstHook).not.toHaveBeenCalled();
    expect(secondHook).toHaveBeenCalledWith(span, {});
    span.end();
  });

  it('uses the routed app user action for fetch and XHR spans', () => {
    const actionA = {
      name: 'action-a',
      parentId: 'parent-a',
      getState: () => UserActionState.Started,
    };
    const actionB = {
      name: 'action-b',
      parentId: 'parent-b',
      getState: () => UserActionState.Started,
    };
    const first = setupInstrumentation('app-a', {
      mode: 'routing',
      apiUrlMatchers: [{ pattern: 'https://api.example.test/a', target: 'full-url' }],
    });
    (first.api.getActiveUserAction as jest.Mock).mockReturnValue(actionA);
    first.instrumentation.initialize();

    const second = setupInstrumentation('app-b', {
      mode: 'routing',
      apiUrlMatchers: [{ pattern: 'https://api.example.test/b', target: 'full-url' }],
    });
    (second.api.getActiveUserAction as jest.Mock).mockReturnValue(actionB);
    second.instrumentation.initialize();

    const registry = getTracingRegistry()!;
    const captureProvider = registry.captureProvider!;
    const fetchSpan = captureProvider
      .getTracer('@opentelemetry/instrumentation-fetch')
      .startSpan('GET', { attributes: { 'url.full': 'https://api.example.test/b' } });
    const fetchActionAttributes = jest.spyOn(fetchSpan, 'setAttribute');
    const fetchInstrumentation = registry.captureInstrumentations?.[0] as unknown as {
      getConfig: () => { requestHook: (span: Span, request: Request | RequestInit) => void };
    };
    fetchInstrumentation.getConfig().requestHook(fetchSpan, {});

    expect(fetchActionAttributes).toHaveBeenCalledWith('faro.action.user.name', 'action-b');
    expect(fetchActionAttributes).toHaveBeenCalledWith('faro.action.user.parentId', 'parent-b');
    fetchSpan.end();

    const xhrSpan = captureProvider
      .getTracer('@opentelemetry/instrumentation-xml-http-request')
      .startSpan('GET', { attributes: { 'url.full': 'https://api.example.test/b' } });
    const xhrActionAttributes = jest.spyOn(xhrSpan, 'setAttribute');
    const xhrInstrumentation = registry.captureInstrumentations?.[1] as unknown as {
      parentCreateSpan: () => Span;
      _patchOpen: () => (original: (...args: unknown[]) => void) => (...args: unknown[]) => void;
      _isEnabled: boolean;
    };
    xhrInstrumentation.parentCreateSpan = () => xhrSpan;
    xhrInstrumentation._isEnabled = true;
    const originalOpen = jest.fn();
    const open = xhrInstrumentation._patchOpen()(originalOpen);
    open.call({} as XMLHttpRequest, 'GET', 'https://api.example.test/b');

    expect(xhrActionAttributes).toHaveBeenCalledWith('faro.action.user.name', 'action-b');
    expect(xhrActionAttributes).toHaveBeenCalledWith('faro.action.user.parentId', 'parent-b');
    xhrSpan.end();
  });

  it('disables dormant capture without unpatching and re-enables it for a later registration', () => {
    const first = setupInstrumentation('app-a', { mode: 'routing', drainTimeoutMs: 0 });
    first.instrumentation.initialize();

    const captureInstrumentations = getTracingRegistry()?.captureInstrumentations;
    expect(captureInstrumentations).toHaveLength(2);
    const disableSpies = captureInstrumentations!.map((instrumentation) => jest.spyOn(instrumentation, 'disable'));
    const enableSpies = captureInstrumentations!.map((instrumentation) => jest.spyOn(instrumentation, 'enable'));

    first.instrumentation.destroy();

    expect(disableSpies.every((spy) => spy.mock.calls.length > 0)).toBe(true);
    expect(getTracingRegistry()?.registrations).toHaveLength(0);
    expect(getFallbackTracingRegistration()).toBeUndefined();
    expect(trace.getTracer('legacy-client').startSpan('after-final-unmount').isRecording()).toBe(false);

    const second = setupInstrumentation('app-b', { mode: 'routing' });
    second.instrumentation.initialize();

    expect(getTracingRegistry()?.captureInstrumentations).toBe(captureInstrumentations);
    expect(enableSpies.every((spy) => spy.mock.calls.length > 0)).toBe(true);
    expect(registerInstrumentations).toHaveBeenCalledTimes(1);
  });

  it('warns and ignores custom instrumentations in routing mode, including an empty list', () => {
    const { instrumentation, internalLogger } = setupInstrumentation('app-a', {
      mode: 'routing',
      instrumentations: [],
    });

    instrumentation.initialize();

    expect((internalLogger.warn as jest.Mock).mock.calls.map((call) => call.join(' ')).join('\n')).toContain(
      'Custom OTel instrumentations are unsupported in routing mode'
    );
    expect((registerInstrumentations as jest.Mock).mock.calls[0]?.[0].instrumentations).toHaveLength(2);
  });

  it('falls back to legacy non-owner behavior when an older Faro bundle already owns tracing', () => {
    expect(claimTracingOwner('legacy-2.13-app')).toBe(true);

    const { instrumentation, api, internalLogger } = setupInstrumentation('routing-app', { mode: 'routing' });

    instrumentation.initialize();

    expect(getTracingRegistry()?.mode).toBe('routing');
    expect(getTracingRegistry()?.registrations).toHaveLength(0);
    expect(registerSpy).not.toHaveBeenCalled();
    expect(registerInstrumentations).not.toHaveBeenCalled();
    expect(getTracingOwner()?.appName).toBe('legacy-2.13-app');
    expect(api.initOTEL).toHaveBeenCalledTimes(1);
    expect((internalLogger.warn as jest.Mock).mock.calls[0]?.join(' ')).toContain(
      'Routing is unavailable because tracing is already owned by another Faro instance'
    );
  });

  it('preserves legacy capture behavior when an external provider is already registered', () => {
    const externalProvider = { getTracer: jest.fn(() => ({ startSpan: jest.fn() })) };
    expect(trace.setGlobalTracerProvider(externalProvider as never)).toBe(true);

    const { instrumentation, internalLogger } = setupInstrumentation('legacy-app');

    instrumentation.initialize();

    expect(registerSpy).toHaveBeenCalledTimes(1);
    expect(registerInstrumentations).toHaveBeenCalledTimes(1);
    expect((registerInstrumentations as jest.Mock).mock.calls[0]?.[0].instrumentations).toHaveLength(2);
    expect(getTracingOwner()?.appName).toBe('legacy-app');
    expect(internalLogger.warn).not.toHaveBeenCalled();
  });

  it('yields to an external provider used only for manual spans in routing mode', () => {
    const externalProvider = { getTracer: jest.fn(() => ({ startSpan: jest.fn() })) };
    expect(trace.setGlobalTracerProvider(externalProvider as never)).toBe(true);

    const { instrumentation, api, internalLogger } = setupInstrumentation('app-a', { mode: 'routing' });

    instrumentation.initialize();

    expect(registerSpy).not.toHaveBeenCalled();
    expect(registerInstrumentations).not.toHaveBeenCalled();
    expect(api.initOTEL).toHaveBeenCalledTimes(1);
    expect((internalLogger.warn as jest.Mock).mock.calls[0]?.join(' ')).toContain(
      'An external global OpenTelemetry tracer provider is already registered. Faro will not register a provider or instrument fetch/XHR.'
    );
  });
});
