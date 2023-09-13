import { initializeFaro } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { XHRInstrumentation } from './instrumentation';

describe('XHRInstrumentation', () => {
  it('initialize XHRInstrumentation with default options', () => {
    const instrumentation = new XHRInstrumentation({
      testing: true,
    });

    expect(instrumentation.name).toBe('@grafana/faro-web-sdk:instrumentation-xhr');
  });

  it('initialize XHRInstrumentation with provided options', () => {
    const instrumentation = new XHRInstrumentation({
      testing: true,
      ignoredUrls: ['https://example.com'],
    });
    instrumentation.initialize();

    expect(instrumentation.getIgnoredUrls()).toEqual(['https://example.com']);
  });

  it('initialize XHRInstrumentation and parses request URL', () => {
    const instrumentation = new XHRInstrumentation({
      testing: true,
    });
    instrumentation.initialize();

    expect(instrumentation.getRequestUrl(new URL('https://example.com'))).toEqual('https://example.com/');
    expect(instrumentation.getRequestUrl('https://example.com')).toEqual('https://example.com');
  });

  it('initialize XHRInstrumentation and send XHR request', () => {
    const instrumentation = new XHRInstrumentation({
      testing: true,
    });

    initializeFaro(mockConfig({ instrumentations: [instrumentation] }));

    const fetchSpyOpen = jest.spyOn(instrumentation, 'originalOpen');
    const fetchSpySend = jest.spyOn(instrumentation, 'originalSend');

    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://grafana.com');
    expect(fetchSpyOpen).toHaveBeenCalledTimes(1);

    xhr.send();
    expect(fetchSpySend).toHaveBeenCalledTimes(1);
  });

  it('initialize XHRInstrumentation and send XHR request to ignoredUrl', () => {
    const transport = new MockTransport();
    const instrumentation = new XHRInstrumentation({
      testing: true,
      ignoredUrls: ['https://example.com'],
    });

    const fetchSpySend = jest.spyOn(instrumentation, 'originalSend');
    const faro = initializeFaro(mockConfig({ instrumentations: [instrumentation], transports: [transport] }));
    faro.pause();

    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com');
    xhr.send();

    expect(transport.items).toHaveLength(0);
    expect(fetchSpySend).toHaveBeenCalledTimes(1);
  });
});
