import { trace } from '@opentelemetry/api';
import { registerInstrumentations } from '@opentelemetry/instrumentation';

import { BaseTransport, initializeFaro } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

import { getDefaultOTELInstrumentations } from './getDefaultOTELInstrumentations';
import { TracingInstrumentation } from './instrumentation';
import { resetTracingOwnerForTests } from './tracingOwner';
import { getTracingRegistry } from './tracingRegistry';

jest.mock('@opentelemetry/instrumentation', () => ({
  ...jest.requireActual('@opentelemetry/instrumentation'),
  registerInstrumentations: jest.fn(),
}));
jest.mock('@opentelemetry/sdk-trace-web');
jest.mock('./getDefaultOTELInstrumentations');

class TestTransport extends BaseTransport {
  name = 'test-transport';
  version = '1.0.0';
  constructor(private url: string) {
    super();
  }
  send() {}
  override getIgnoreUrls() {
    return [this.url];
  }
}

function setup(options = {}) {
  const faro = initializeFaro(mockConfig({ transports: [], ignoreUrls: [/ignored/] }));
  const instrumentation = new TracingInstrumentation(options);
  Object.assign(instrumentation, {
    api: faro.api,
    config: faro.config,
    metas: faro.metas,
    transports: faro.transports,
  });
  instrumentation.initialize();
  return { instrumentation, faro };
}

beforeEach(() => {
  trace.disable();
  resetTracingOwnerForTests();
  jest.clearAllMocks();
});

afterEach(() => {
  trace.disable();
  resetTracingOwnerForTests();
});

it('updates both default instrumentations, preserves options and stops listening on destroy', () => {
  const fetch = { getConfig: () => ({ ignoreNetworkEvents: false }), setConfig: jest.fn() };
  const xhr = { getConfig: () => ({ propagateTraceHeaderCorsUrls: ['https://api.test'] }), setConfig: jest.fn() };
  jest.mocked(getDefaultOTELInstrumentations).mockReturnValue([fetch, xhr] as any);
  const { instrumentation, faro } = setup();
  const transport = new TestTransport('/telemetry');
  faro.transports.add(transport);
  const ignoreUrls = [/ignored/, '/telemetry', new URL('/telemetry', document.baseURI).href];
  expect(fetch.setConfig).toHaveBeenLastCalledWith({ ignoreNetworkEvents: false, ignoreUrls });
  expect(xhr.setConfig).toHaveBeenLastCalledWith({ propagateTraceHeaderCorsUrls: ['https://api.test'], ignoreUrls });
  faro.transports.remove(transport);
  expect(fetch.setConfig).toHaveBeenLastCalledWith({ ignoreNetworkEvents: false, ignoreUrls: [/ignored/] });
  instrumentation.destroy();
  faro.transports.add(transport);
  expect(fetch.setConfig).toHaveBeenCalledTimes(2);
});

it('normalizes and appends collector URLs added after routing initialization', () => {
  const base = document.createElement('base');
  base.href = 'https://collector.example.test/app/';
  document.head.prepend(base);
  const captureInstrumentation = {
    enable: jest.fn(),
    disable: jest.fn(),
    getConfig: () => ({}),
    setConfig: jest.fn(),
  };
  jest.mocked(getDefaultOTELInstrumentations).mockReturnValue([captureInstrumentation, captureInstrumentation] as any);
  const { instrumentation, faro } = setup({ mode: 'routing', drainTimeoutMs: 0 });
  const registry = getTracingRegistry()!;
  const provider = registry.registrations[0]!.provider as unknown as { shutdown: () => Promise<void> };
  provider.shutdown = jest.fn().mockResolvedValue(undefined);
  const transport = new TestTransport('../telemetry');

  try {
    faro.transports.add(transport);
    expect(registry.collectorIgnoreUrls).toContain('../telemetry');
    expect(registry.collectorIgnoreUrls).toContain('https://collector.example.test/telemetry');

    faro.transports.remove(transport);
    expect(registry.collectorIgnoreUrls).toContain('https://collector.example.test/telemetry');

    instrumentation.destroy();
    faro.transports.add(new TestTransport('/late-collector'));
    expect(registry.collectorIgnoreUrls).not.toContain('https://collector.example.test/late-collector');
  } finally {
    instrumentation.destroy();
    base.remove();
  }
});

it('leaves explicitly supplied instrumentations under caller control', () => {
  const custom = { getConfig: jest.fn(), setConfig: jest.fn() };
  const { instrumentation, faro } = setup({ instrumentations: [custom] });
  faro.transports.add(new TestTransport('/telemetry'));
  expect(getDefaultOTELInstrumentations).not.toHaveBeenCalled();
  expect(registerInstrumentations).toHaveBeenCalledWith({ instrumentations: [custom] });
  expect(custom.setConfig).not.toHaveBeenCalled();
  instrumentation.destroy();
});
