import { initializeFaro } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils/mockConfig';

import { SessionInstrumentation } from '@grafana/faro-web-sdk';

import { makeFaroRumHeaderValue } from './constants';
import { FetchInstrumentation } from './instrumentation';

describe('FetchInstrumentation', () => {
  it('initialize FetchInstrumentation with default options', () => {
    const instrumentation = new FetchInstrumentation({
      testing: true,
    });

    expect(instrumentation.name).toBe('@grafana/faro-web-sdk:instrumentation-fetch');
  });

  it('initialize FetchInstrumentation with provided options', () => {
    const instrumentation = new FetchInstrumentation({
      testing: true,
      ignoredUrls: ['https://example.com'],
    });
    instrumentation.initialize();

    expect(instrumentation.getIgnoredUrls()).toEqual(['https://example.com']);
  });

  it('initialize FetchInstrumentation and parses Request URL', () => {
    const instrumentation = new FetchInstrumentation({
      testing: true,
    });
    instrumentation.initialize();

    expect(instrumentation.getRequestUrl(new Request('https://example.com'))).toEqual('https://example.com/');
    expect(instrumentation.getRequestUrl('https://example.com')).toEqual('https://example.com');
  });

  it('initialize FetchInstrumentation and builds Request and Init objects', () => {
    const instrumentation = new FetchInstrumentation({
      testing: true,
    });

    const sessionInstrumentation = new SessionInstrumentation();

    const faroInstance = initializeFaro(mockConfig({ instrumentations: [instrumentation, sessionInstrumentation] }));
    const sessionId = faroInstance.api.getSession()!.id as string;
    expect(sessionId).not.toBe('');

    const parseActualResult = (res: { init?: RequestInit | undefined; request: Request }) => {
      return {
        init: {
          method: res.init?.method,
          cache: res.init?.cache,
        },
        request: {
          method: res.request.method,
          url: res.request.url,
          headers: res.request.headers,
          destination: res.request.destination,
          referrerPolicy: res.request.referrerPolicy,
          mode: res.request.mode,
          credentials: res.request.credentials,
          cache: res.request.cache,
          redirect: res.request.redirect,
          integrity: res.request.integrity,
          bodyUsed: res.request.bodyUsed,
        },
      };
    };
    const actualResult = parseActualResult(
      instrumentation.buildRequestAndInit(new Request('https://example.com'), { method: 'GET', cache: 'no-cache' })
    );

    const expectedResult = {
      init: {
        method: 'GET',
        cache: 'no-cache',
      },
      request: {
        method: 'GET',
        url: 'https://example.com/',
        headers: new Headers({
          'x-faro-session': makeFaroRumHeaderValue(sessionId),
        }),
        destination: '',
        referrerPolicy: '',
        mode: 'cors',
        credentials: 'same-origin',
        cache: 'default',
        redirect: 'follow',
        integrity: '',
        bodyUsed: false,
      },
    };

    expect(actualResult.init?.toString()).toEqual(expectedResult.init?.toString());
    expect(actualResult.request?.toString()).toEqual(expectedResult.request?.toString());
  });

  it('initialize FetchInstrumentation and calls fetch', () => {
    const instrumentation = new FetchInstrumentation({
      testing: true,
    });

    const sessionId = 'test-session-id';

    initializeFaro(mockConfig({ instrumentations: [instrumentation], session: { id: sessionId } }));

    const fetchSpy = jest.spyOn(global, 'fetch');

    window.fetch('https://grafana.com');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('initialize FetchInstrumentation and calls fetch on an ignoredUrl, calls originalFetch', () => {
    const instrumentation = new FetchInstrumentation({
      testing: true,
      ignoredUrls: ['https://example.com'],
    });

    initializeFaro(mockConfig({ instrumentations: [instrumentation] }));

    const originalFetchSpy = jest.spyOn(instrumentation, 'originalFetch');

    window.fetch('https://example.com');

    expect(originalFetchSpy).toHaveBeenCalledTimes(1);
  });
});
