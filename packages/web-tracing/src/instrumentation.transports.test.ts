import { registerInstrumentations } from '@opentelemetry/instrumentation';

import { BaseTransport, initializeFaro } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

import { getDefaultOTELInstrumentations } from './getDefaultOTELInstrumentations';
import { TracingInstrumentation } from './instrumentation';

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

beforeEach(() => jest.clearAllMocks());

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

it('leaves explicitly supplied instrumentations under caller control', () => {
  const custom = { getConfig: jest.fn(), setConfig: jest.fn() };
  const { instrumentation, faro } = setup({ instrumentations: [custom] });
  faro.transports.add(new TestTransport('/telemetry'));
  expect(getDefaultOTELInstrumentations).not.toHaveBeenCalled();
  expect(registerInstrumentations).toHaveBeenCalledWith({ instrumentations: [custom] });
  expect(custom.setConfig).not.toHaveBeenCalled();
  instrumentation.destroy();
});
