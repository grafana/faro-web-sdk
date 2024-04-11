import { initializeFaro } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';
import { FetchTransport, makeCoreConfig, SessionInstrumentation } from '@grafana/faro-web-sdk';

import { XHRInstrumentation } from './instrumentation';
import { faroRumHeader, makeFaroRumHeaderValue } from './types';
import * as mockUtilsModule from './utils';

describe('XHRInstrumentation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

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
    const faroInstance = initializeFaro(
      makeCoreConfig(mockConfig({ instrumentations: [instrumentation, sessionInstrumentation] }))!
    );

    const sessionId = faroInstance.api.getSession()!.id as string;
    expect(sessionId).not.toBe('');

    const mockFetchSpyOpen = jest.fn();
    jest.spyOn(instrumentation, 'originalOpen').mockImplementationOnce(mockFetchSpyOpen);

    const mockFetchSpySend = jest.fn();
    jest.spyOn(instrumentation, 'originalSend').mockImplementationOnce(mockFetchSpySend);

    const mockOriginalSetRequestHeader = jest.fn();
    jest.spyOn(instrumentation, 'originalSetRequestHeader').mockImplementationOnce(mockOriginalSetRequestHeader);

    const xhr = new XMLHttpRequest();
    // auto adds rum headers to requests sent to the same origin
    xhr.open('GET', window.location.origin + '/test');
    expect(mockFetchSpyOpen).toHaveBeenCalledTimes(1);

    xhr.send();
    expect(mockFetchSpySend).toHaveBeenCalledTimes(1);

    // check if faro session was added to the request headers
    expect(mockOriginalSetRequestHeader).toHaveBeenCalledTimes(1);
    expect(mockOriginalSetRequestHeader).toHaveBeenCalledWith(faroRumHeader, makeFaroRumHeaderValue(sessionId));
  });

  it('initialize XHRInstrumentation and send XHR request to ignoredUrl', () => {
    const sessionInstrumentation = new SessionInstrumentation();
    const transport = new MockTransport();
    const instrumentation = new XHRInstrumentation({ ignoredUrls: ['https://example.com'] });

    const mockOriginalSetRequestHeader = jest.fn();
    jest.spyOn(instrumentation, 'originalSetRequestHeader').mockImplementationOnce(mockOriginalSetRequestHeader);

    const mockFetchSpySend = jest.fn();
    jest.spyOn(instrumentation, 'originalSend').mockImplementationOnce(mockFetchSpySend);

    const faro = initializeFaro(
      makeCoreConfig(
        mockConfig({ instrumentations: [instrumentation, sessionInstrumentation], transports: [transport] })
      )!
    );
    faro.pause();

    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://example.com');
    xhr.send();

    // We expect one item because the session instrumentation is enabled
    expect(transport.items).toHaveLength(1);
    expect(mockFetchSpySend).toHaveBeenCalledTimes(1);

    // if URL ignored, don't inject faro session header
    expect(mockOriginalSetRequestHeader).toHaveBeenCalledTimes(0);
  });

  it('Does not add Faro RUM header to requests to a different origin as the current document.', () => {
    const instrumentation = new XHRInstrumentation({});

    const sessionInstrumentation = new SessionInstrumentation();
    const faroInstance = initializeFaro(
      makeCoreConfig(mockConfig({ instrumentations: [instrumentation, sessionInstrumentation] }))!
    );

    const sessionId = faroInstance.api.getSession()!.id as string;
    expect(sessionId).not.toBe('');

    const mockFetchSpyOpen = jest.fn();
    jest.spyOn(instrumentation, 'originalOpen').mockImplementationOnce(mockFetchSpyOpen);

    const mockFetchSpySend = jest.fn();
    jest.spyOn(instrumentation, 'originalSend').mockImplementationOnce(mockFetchSpySend);

    const mockOriginalSetRequestHeader = jest.fn();
    jest.spyOn(instrumentation, 'originalSetRequestHeader').mockImplementationOnce(mockOriginalSetRequestHeader);

    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://grafana.com');
    expect(mockFetchSpyOpen).toHaveBeenCalledTimes(1);

    xhr.send();
    expect(mockFetchSpySend).toHaveBeenCalledTimes(1);

    // check if faro session has NOT been added to the request headers
    expect(mockOriginalSetRequestHeader).not.toHaveBeenCalledWith(faroRumHeader, makeFaroRumHeaderValue(sessionId));
  });

  it('Add Faro RUM header to requests to origins configured to have rum headers attached .', () => {
    const instrumentation = new XHRInstrumentation({
      propagateRumHeaderCorsUrls: [new RegExp(/grafana/)],
    });

    const sessionInstrumentation = new SessionInstrumentation();
    const faroInstance = initializeFaro(
      makeCoreConfig(mockConfig({ instrumentations: [instrumentation, sessionInstrumentation] }))!
    );

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

    // check if faro session has NOT been added to the request headers
    expect(fetchSpySetRequestHeader).toHaveBeenCalledWith(faroRumHeader, makeFaroRumHeaderValue(sessionId));
  });

  it('Only calls originalSend for ignored url, does not proceed executing Faro specific logic', () => {
    const mockShouldPropagateRumHeaders = jest.fn();
    jest.spyOn(mockUtilsModule, 'shouldPropagateRumHeaders').mockImplementationOnce(mockShouldPropagateRumHeaders);

    const instrumentation = new XHRInstrumentation({
      ignoredUrls: ['https://example.com'],
    });

    initializeFaro(
      mockConfig({
        instrumentations: [instrumentation],
      })
    );

    const mockFetchSpyOpen = jest.fn();
    jest.spyOn(instrumentation, 'originalOpen').mockImplementationOnce(mockFetchSpyOpen);

    const mockFetchSpySend = jest.fn();
    jest.spyOn(instrumentation, 'originalSend').mockImplementationOnce(mockFetchSpySend);

    const xhr = new XMLHttpRequest();

    xhr.open('GET', 'https://example.com');
    expect(mockFetchSpyOpen).toHaveBeenCalledTimes(1);

    xhr.send();
    expect(mockFetchSpySend).toHaveBeenCalledTimes(1); // This is the first function called if URL is NOT ignored.

    // It's not ideal to test like this but okish for now
    expect(mockShouldPropagateRumHeaders).not.toHaveBeenCalled();
  });

  it('Merges local ignoredUrls with publicUrls', () => {
    const localIgnoreUrl = 'https://example.com';
    const instrumentation = new XHRInstrumentation({
      ignoredUrls: [localIgnoreUrl],
    });

    const globalIgnoreUrl = 'https://foo.com';

    const collectorUrl = 'collector-endpoint';
    const fetchTransport = new FetchTransport({ url: collectorUrl });

    const config = mockConfig({
      transports: [fetchTransport],
      instrumentations: [instrumentation],
      ignoreUrls: [globalIgnoreUrl],
    });

    initializeFaro(config);

    expect(instrumentation.getIgnoredUrls()).toStrictEqual([localIgnoreUrl, collectorUrl, globalIgnoreUrl]);
  });
});
