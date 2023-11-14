import { initializeFaro } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';
import { SessionInstrumentation } from '@grafana/faro-web-sdk';

import { XHRInstrumentation } from './instrumentation';
import { faroRumHeader, makeFaroRumHeaderValue } from './types';

describe('XHRInstrumentation', () => {
  it('initialize XHRInstrumentation with default options', () => {
    const instrumentation = new XHRInstrumentation({});

    expect(instrumentation.name).toBe('@grafana/faro-web-sdk:instrumentation-xhr');
  });

  it('initialize XHRInstrumentation with provided options', () => {
    const instrumentation = new XHRInstrumentation({ ignoredUrls: ['https://example.com'] });
    instrumentation.initialize();

    expect(instrumentation.getIgnoredUrls()).toEqual(['https://example.com']);
  });

  it('initialize XHRInstrumentation and parses request URL', () => {
    const instrumentation = new XHRInstrumentation({});
    instrumentation.initialize();

    expect(instrumentation.getRequestUrl(new URL('https://example.com'))).toEqual('https://example.com/');
    expect(instrumentation.getRequestUrl('https://example.com')).toEqual('https://example.com');
  });

  it('initialize XHRInstrumentation and send XHR request', () => {
    const instrumentation = new XHRInstrumentation({});

    const sessionInstrumentation = new SessionInstrumentation();
    const faroInstance = initializeFaro(mockConfig({ instrumentations: [instrumentation, sessionInstrumentation] }));

    const sessionId = faroInstance.api.getSession()!.id as string;
    expect(sessionId).not.toBe('');

    const fetchSpyOpen = jest.spyOn(instrumentation, 'originalOpen');
    const fetchSpySend = jest.spyOn(instrumentation, 'originalSend');
    const fetchSpySetRequestHeader = jest.spyOn(instrumentation, 'originalSetRequestHeader');

    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://grafana.com');
    expect(fetchSpyOpen).toHaveBeenCalledTimes(1);

    xhr.send();
    expect(fetchSpySend).toHaveBeenCalledTimes(1);

    // check if faro session was added to the request headers
    expect(fetchSpySetRequestHeader).toHaveBeenCalledTimes(1);
    expect(fetchSpySetRequestHeader).toHaveBeenCalledWith(faroRumHeader, makeFaroRumHeaderValue(sessionId));
  });

  it('initialize XHRInstrumentation and send XHR request to ignoredUrl', () => {
    const sessionId = 'test-session-id';
    const transport = new MockTransport();
    const instrumentation = new XHRInstrumentation({ ignoredUrls: ['https://example.com'] });

    const fetchSpySetRequestHeader = jest.spyOn(instrumentation, 'originalSetRequestHeader');
    const fetchSpySend = jest.spyOn(instrumentation, 'originalSend');
    const faro = initializeFaro(
      mockConfig({ instrumentations: [instrumentation], session: { id: sessionId }, transports: [transport] })
    );
    faro.pause();

    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com');
    xhr.send();

    expect(transport.items).toHaveLength(0);
    expect(fetchSpySend).toHaveBeenCalledTimes(1);

    // if URL ignored, don't inject faro session header
    expect(fetchSpySetRequestHeader).toHaveBeenCalledTimes(0);
  });
});
