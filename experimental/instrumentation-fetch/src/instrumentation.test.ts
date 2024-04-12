import { initializeFaro } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';
import { FetchTransport, makeCoreConfig, SessionInstrumentation } from '@grafana/faro-web-sdk';

import { makeFaroRumHeaderValue } from './constants';
import { FetchInstrumentation } from './instrumentation';

describe('FetchInstrumentation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

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

    const faroInstance = initializeFaro(
      makeCoreConfig(mockConfig({ instrumentations: [instrumentation, sessionInstrumentation] }))!
    );
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
        headers: {},
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

    expect(actualResult.init).toStrictEqual(expectedResult.init);
    expect(JSON.stringify(actualResult.request)).toEqual(JSON.stringify(expectedResult.request));
  });

  it('Adds RUM headers to same origin request', () => {
    const instrumentation = new FetchInstrumentation({
      testing: true,
    });

    const sessionInstrumentation = new SessionInstrumentation();

    const faroInstance = initializeFaro(
      makeCoreConfig(mockConfig({ instrumentations: [instrumentation, sessionInstrumentation] }))!
    );
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

    const requestUrl = window.location.origin + '/test';

    const actualResult = parseActualResult(
      instrumentation.buildRequestAndInit(new Request(requestUrl), {
        method: 'GET',
        cache: 'no-cache',
      })
    );

    const expectedResult = {
      init: {
        method: 'GET',
        cache: 'no-cache',
      },
      request: {
        method: 'GET',
        url: requestUrl,
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

    expect(actualResult.init).toStrictEqual(expectedResult.init);
    expect({ ...actualResult.request, headers: actualResult.request.headers.get('x-faro-session') }).toStrictEqual({
      ...expectedResult.request,
      headers: expectedResult.request.headers.get('x-faro-session'),
    });
    expect(actualResult.request.headers.get('x-faro-session')).toBe(makeFaroRumHeaderValue(sessionId));
  });

  it('Adds RUM headers to requests to a different origin, which is explicitly allowed via the config', () => {
    const instrumentation = new FetchInstrumentation({
      testing: true,
      propagateRumHeaderCorsUrls: ['https://example2.com'],
    });

    const sessionInstrumentation = new SessionInstrumentation();

    const faroInstance = initializeFaro(
      makeCoreConfig(mockConfig({ instrumentations: [instrumentation, sessionInstrumentation] }))!
    );
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
      instrumentation.buildRequestAndInit(new Request('https://example2.com'), { method: 'GET', cache: 'no-cache' })
    );

    const expectedResult = {
      init: {
        method: 'GET',
        cache: 'no-cache',
      },
      request: {
        method: 'GET',
        url: 'https://example2.com/',
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

    expect(actualResult.init).toStrictEqual(expectedResult.init);
    expect({ ...actualResult.request, headers: actualResult.request.headers.get('x-faro-session') }).toStrictEqual({
      ...expectedResult.request,
      headers: expectedResult.request.headers.get('x-faro-session'),
    });
    expect(actualResult.request.headers.get('x-faro-session')).toBe(makeFaroRumHeaderValue(sessionId));
  });

  it('initialize FetchInstrumentation and calls fetch', () => {
    const instrumentation = new FetchInstrumentation({
      testing: true,
    });

    const sessionId = 'test-session-id';

    initializeFaro(
      mockConfig({ instrumentations: [instrumentation], sessionTracking: { session: { id: sessionId } } })
    );

    const mockFetch = jest.fn();
    jest.spyOn(global, 'fetch').mockImplementationOnce(mockFetch);

    window.fetch('https://grafana.com');

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('initialize FetchInstrumentation and calls fetch on an ignoredUrl, calls originalFetch', () => {
    const instrumentation = new FetchInstrumentation({
      testing: true,
      ignoredUrls: ['https://example.com'],
    });

    jest.spyOn(instrumentation, 'originalFetch').mockImplementationOnce(jest.fn());

    const faro = initializeFaro(
      mockConfig({
        instrumentations: [instrumentation],
      })
    );

    const mockPushEventApi = jest.fn();
    jest.spyOn(faro.api, 'pushEvent').mockImplementationOnce(mockPushEventApi);

    window.fetch('https://example.com');

    expect(mockPushEventApi).toHaveBeenCalledTimes(0);
  });

  it('Merges local ignoredUrls with globally excluded urls', () => {
    const localIgnoreUrl = 'https://example.com';
    const instrumentation = new FetchInstrumentation({
      testing: true,
      ignoredUrls: [localIgnoreUrl],
    });

    const globalIgnoreUrl = 'https://foo.com';

    const collectorUrl = 'collector-endpoint';
    const fetchTransport = new FetchTransport({ url: collectorUrl });

    const config = mockConfig({
      transports: [fetchTransport],
      instrumentations: [instrumentation],
      ignoreEndpoints: [globalIgnoreUrl],
    });

    initializeFaro(config);

    const mockOriginalFetch = jest.fn();
    jest.spyOn(global, 'fetch').mockImplementationOnce(mockOriginalFetch);

    expect(instrumentation.getIgnoredUrls()).toStrictEqual([localIgnoreUrl, collectorUrl, globalIgnoreUrl]);
  });
});
