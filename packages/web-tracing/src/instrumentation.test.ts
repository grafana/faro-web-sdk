import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';

import type { API, Config, InternalLogger, Metas, Transports } from '@grafana/faro-web-sdk';

import { TracingInstrumentation } from './instrumentation';
import { getTracingOwner, resetTracingOwnerForTests } from './tracingOwner';
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
    transports: { transports: [] } as unknown as Transports,
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
});
