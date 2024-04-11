import { initializeFaro } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';
import { makeCoreConfig, SessionInstrumentation } from '@grafana/faro-web-sdk';

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
    const faroInstance = initializeFaro(
      makeCoreConfig(mockConfig({ instrumentations: [instrumentation, sessionInstrumentation] }))!
    );

    const sessionId = faroInstance.api.getSession()!.id as string;
    expect(sessionId).not.toBe('');

    const fetchSpyOpen = jest.spyOn(instrumentation, 'originalOpen');
    const fetchSpySend = jest.spyOn(instrumentation, 'originalSend');
    const fetchSpySetRequestHeader = jest.spyOn(instrumentation, 'originalSetRequestHeader');

    const xhr = new XMLHttpRequest();
    // auto adds rum headers to requests sent to the same origin
    xhr.open('GET', window.location.origin + '/test');
    expect(fetchSpyOpen).toHaveBeenCalledTimes(1);

    xhr.send();
    expect(fetchSpySend).toHaveBeenCalledTimes(1);

    // check if faro session was added to the request headers
    expect(fetchSpySetRequestHeader).toHaveBeenCalledTimes(1);
    expect(fetchSpySetRequestHeader).toHaveBeenCalledWith(faroRumHeader, makeFaroRumHeaderValue(sessionId));
  });

  it('initialize XHRInstrumentation and send XHR request to ignoredUrl', () => {
    const sessionInstrumentation = new SessionInstrumentation();
    const transport = new MockTransport();
    const instrumentation = new XHRInstrumentation({ ignoredUrls: ['https://example.com'] });

    const fetchSpySetRequestHeader = jest.spyOn(instrumentation, 'originalSetRequestHeader');
    const fetchSpySend = jest.spyOn(instrumentation, 'originalSend');
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
    expect(fetchSpySend).toHaveBeenCalledTimes(1);

    // if URL ignored, don't inject faro session header
    expect(fetchSpySetRequestHeader).toHaveBeenCalledTimes(0);
  });

  it('Does not add Faro RUM header to requests to a different origin as the current document.', () => {
    const instrumentation = new XHRInstrumentation({});

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
    expect(fetchSpySetRequestHeader).not.toHaveBeenCalledWith(faroRumHeader, makeFaroRumHeaderValue(sessionId));
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

  it('initialize XHRInstrumentation and calls fetch on an ignoredUrl, calls originalSend', () => {
    const instrumentation = new XHRInstrumentation({
      ignoredUrls: ['https://example.com'],
    });

    const transport = new MockTransport();

    initializeFaro(
      mockConfig({
        transports: [transport],
        instrumentations: [instrumentation],
      })
    );

    const fetchSpyOpen = jest.spyOn(instrumentation, 'originalOpen');
    const fetchSpySend = jest.spyOn(instrumentation, 'originalSend');

    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://grafana.com');
    expect(fetchSpyOpen).toHaveBeenCalledTimes(1);

    xhr.send();
    expect(fetchSpySend).toHaveBeenCalledTimes(1);

    expect(transport.items.length).toBe(1);
  });

  it('Ignores globally defined urls', () => {
    const instrumentation = new XHRInstrumentation();

    const transport = new MockTransport();

    initializeFaro(
      mockConfig({
        transports: [transport],
        instrumentations: [instrumentation],
        ignoreUrls: [/.*example.com/],
      })
    );

    const fetchSpyOpen = jest.spyOn(instrumentation, 'originalOpen');
    const fetchSpySend = jest.spyOn(instrumentation, 'originalSend');

    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://grafana.com');
    expect(fetchSpyOpen).toHaveBeenCalledTimes(1);

    xhr.send();
    expect(fetchSpySend).toHaveBeenCalledTimes(1);

    expect(transport.items.length).toBe(0);
  });
});
