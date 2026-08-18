/**
 * @jest-environment node
 */
import { isFunction } from '@grafana/faro-core';

import { initializeFaro } from '../initialize';

import { makeCoreConfig } from './makeCoreConfig';

const browserConfig = {
  url: 'http://example.com/my-collector',
  app: { name: 'no-dom-app' },
};

describe('makeCoreConfig in an environment without a DOM', () => {
  it('does not throw while detecting a k6 session', () => {
    expect(() => makeCoreConfig(browserConfig)).not.toThrow();
  });

  it('skips the web instrumentations because they depend on DOM APIs', () => {
    const config = makeCoreConfig(browserConfig);

    expect(config?.instrumentations).toEqual([]);
  });

  it('keeps instrumentations which are not provided by the web SDK', () => {
    const customInstrumentation = {
      name: 'custom-instrumentation',
      version: '1.0.0',
      initialize: () => {},
    };

    const config = makeCoreConfig({
      ...browserConfig,
      instrumentations: [customInstrumentation as any],
    });

    expect(config?.instrumentations).toEqual([customInstrumentation]);
  });

  it('omits the browser and page metas and keeps the DOM independent ones', () => {
    const config = makeCoreConfig(browserConfig);
    const metas = config?.metas.map((item) => (isFunction(item) ? item() : item));

    // the os meta resolves to an empty object because there is no user agent to parse
    expect(metas).toEqual([{}, { sdk: expect.objectContaining({ name: 'faro-web' }) }]);
  });
});

describe('initializeFaro in an environment without a DOM', () => {
  it('initializes without throwing and exposes a working API', () => {
    let faro: ReturnType<typeof initializeFaro>;

    expect(() => {
      faro = initializeFaro({
        app: browserConfig.app,
        transports: [],
        batching: { enabled: false },
        isolate: true,
      });
    }).not.toThrow();

    expect(faro!).toBeTruthy();
    expect(() => faro.metas.value).not.toThrow();
    expect(() => faro.api.pushEvent('an-event')).not.toThrow();
  });
});
