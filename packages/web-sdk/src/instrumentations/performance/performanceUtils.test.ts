import {
  createFaroNavigationTiming,
  createFaroResourceTiming,
  getSpanContextFromServerTiming,
  includePerformanceEntry,
} from './performanceUtils';
import { performanceNavigationEntry, performanceResourceEntry } from './performanceUtilsTestData';
import type { FaroNavigationTiming, FaroResourceTiming } from './types';

Object.defineProperty(window, 'performance', {
  configurable: true,
  value: {
    timeOrigin: 0,
    timing: {
      domLoading: 542,
    },
  },
  writable: true,
});

describe('performanceUtils', () => {
  it(`calculates navigation timing`, () => {
    const faroNavigationTiming = createFaroNavigationTiming(performanceNavigationEntry);
    expect(faroNavigationTiming).toStrictEqual({
      visibilityState: 'visible',
      duration: '2700',
      pageLoadTime: '2441',
      documentParsingTime: '705',
      domProcessingTime: '1431',
      onLoadTime: '22',
      domContentLoadHandlerTime: '3',
      ttfb: '542',
      type: 'navigate',

      name: 'http://example.com',
      httpHost: 'example.com',
      tcpHandshakeTime: '53',
      dnsLookupTime: '139',
      tlsNegotiationTime: '33',
      redirectTime: '1',
      requestTime: '109',
      responseTime: '0',
      responseStatus: '200',
      fetchTime: '305',
      serviceWorkerTime: '0',
      decodedBodySize: '530675',
      encodedBodySize: '126111',
      cacheHitStatus: 'fullLoad',
      renderBlockingStatus: 'unknown',
      protocol: 'h2',
      initiatorType: 'navigation',
      transferSize: '127601',
    } as FaroNavigationTiming);
  });

  it(`calculates resource timings`, () => {
    const faroResourceTiming = createFaroResourceTiming(performanceResourceEntry);
    expect(faroResourceTiming).toStrictEqual({
      name: 'http://example.com/awesome-image',
      httpHost: 'example.com',
      duration: '370',
      tcpHandshakeTime: '0',
      dnsLookupTime: '0',
      tlsNegotiationTime: '178',
      redirectTime: '0',
      requestTime: '359',
      responseTime: '0',
      responseStatus: '200',
      fetchTime: '370',
      serviceWorkerTime: '0',
      decodedBodySize: '10526',
      encodedBodySize: '10526',
      cacheHitStatus: 'fullLoad',
      renderBlockingStatus: 'unknown',
      protocol: 'h2',
      initiatorType: 'img',
      ttfb: '359',
      visibilityState: 'visible',
      transferSize: '11459',
    } as FaroResourceTiming);
  });

  it(`extracts httpHost from the resource name`, () => {
    expect(createFaroResourceTiming({ name: 'http://example.com/path' } as any).httpHost).toBe('example.com');
    expect(createFaroResourceTiming({ name: 'http://example.com:8080/path' } as any).httpHost).toBe('example.com:8080');
    expect(createFaroResourceTiming({ name: 'not a url' } as any).httpHost).toBe('unknown');
    expect(createFaroResourceTiming({} as any).httpHost).toBe('unknown');
    expect(createFaroResourceTiming({ name: 'data:text/plain;base64,SGVsbG8=' } as any).httpHost).toBe('unknown');
    expect(
      createFaroResourceTiming({
        name: 'blob:https://example.com/550e8400-e29b-41d4-a716-446655440000',
      } as any).httpHost
    ).toBe('unknown');
  });

  it(`calculates cacheHitStatus`, () => {
    expect(createFaroResourceTiming({ transferSize: 0 } as any).cacheHitStatus).toBe('fullLoad');
    expect(createFaroResourceTiming({ transferSize: 1 } as any).cacheHitStatus).toBe('fullLoad');

    expect(createFaroResourceTiming({ transferSize: 0, decodedBodySize: 1 } as any).cacheHitStatus).toBe('cache');

    expect(createFaroResourceTiming({ transferSize: 1, encodedBodySize: 0 } as any).cacheHitStatus).toBe('fullLoad');
    expect(createFaroResourceTiming({ transferSize: 1, encodedBodySize: 1 } as any).cacheHitStatus).toBe('fullLoad');
    expect(createFaroResourceTiming({ transferSize: 1, encodedBodySize: 2 } as any).cacheHitStatus).toBe(
      'conditionalFetch'
    );

    // For browsers supporting the responseStatus property
    expect(
      createFaroResourceTiming({ transferSize: 1, encodedBodySize: 1, responseStatus: 200 } as any).cacheHitStatus
    ).toBe('fullLoad');
    expect(
      createFaroResourceTiming({ transferSize: 1, encodedBodySize: 1, responseStatus: 304 } as any).cacheHitStatus
    ).toBe('conditionalFetch');
  });

  it(`Sets renderBlockingStatus`, () => {
    // For browsers supporting the responseStatus property
    expect(createFaroResourceTiming({ renderBlockingStatus: 'blocking' } as any).renderBlockingStatus).toBe('blocking');

    // For browsers which do not support the responseStatus property
    expect(createFaroResourceTiming({} as any).renderBlockingStatus).toBe('unknown');
  });

  it(`Sets documentParsingTime to "unknown" in case it is not supported by a certain browser`, () => {
    Object.defineProperty(window, 'performance', {
      configurable: true,
      value: {
        timeOrigin: 0,
      },
      writable: true,
    });

    const faroNavigationTiming = createFaroNavigationTiming(performanceNavigationEntry);
    expect(faroNavigationTiming.documentParsingTime).toBe('unknown');
  });

  it('Returns true for configured entries ', () => {
    const initiatorTypes = ['css', 'fetch', 'xmlhttprequest', 'link', 'script'];

    const entries = initiatorTypes.map((initiatorType) => ({ ...performanceResourceEntry, initiatorType }));

    const matchByValue = includePerformanceEntry(entries[0]!, { initiatorType: 'css' });
    expect(matchByValue).toBe(true);

    const matchByMultiValues1 = includePerformanceEntry(entries[1]!, {
      initiatorType: ['fetch', 'xmlhttprequest', 'link'],
    });
    expect(matchByMultiValues1).toBe(true);

    const matchByMultiValues2 = includePerformanceEntry(entries[2]!, {
      initiatorType: ['fetch', 'xmlhttprequest', 1],
    });
    expect(matchByMultiValues2).toBe(true);
  });

  it('Returns true if entries are undefined or empty object', () => {
    const initiatorTypes = ['css', 'fetch', 'xmlhttprequest', 'link', 'script'];

    const entries = initiatorTypes.map((initiatorType) => ({ ...performanceResourceEntry, initiatorType }));

    const matchedEntriesUndefined = entries.map((entry) => includePerformanceEntry(entry, undefined));
    expect(matchedEntriesUndefined.every((e) => Boolean(e))).toBe(true);

    const matchedEntriesEmptyObject = entries.map((entry) => includePerformanceEntry(entry, {}));
    expect(matchedEntriesEmptyObject.every((e) => Boolean(e))).toBe(true);
  });

  it('Returns false if key or value does not match', () => {
    const initiatorTypes = ['css', 'fetch', 'xmlhttprequest', 'link', 'script'];

    const entries = initiatorTypes.map((initiatorType) => ({ ...performanceResourceEntry, initiatorType }));

    const noMatchByValue = includePerformanceEntry(entries[0]!, { initiatorType: 'NO_MATCHING_VALUE' });
    expect(noMatchByValue).toBe(false);

    const noMatchingProperty = includePerformanceEntry(entries[1]!, { initiatorTypeABC: 'abc' });
    expect(noMatchingProperty).toBe(false);

    const matchByMultiValues1 = includePerformanceEntry(entries[1]!, {
      initiatorType: ['NOfetch', 'NOxmlhttprequest', 'link'],
    });
    expect(matchByMultiValues1).toBe(false);
  });

  it('Can extract a span context if server returns a traceId and spanId', () => {
    const serverTimings: PerformanceServerTiming[] = [
      {
        name: 'traceparent',
        description: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
        duration: 0,
        toJSON(): any {},
      },
    ];

    const spanContext = getSpanContextFromServerTiming(serverTimings);
    expect(spanContext).toStrictEqual({ traceId: '0af7651916cd43dd8448eb211c80319c', spanId: 'b7ad6b7169203331' });
  });

  it('Ignores incoming traceparent server-timings if they are not conformant to w3c trace-context', () => {
    const serverTimings: PerformanceServerTiming[] = [
      {
        name: 'traceparent',
        description: '00-1234-5678-01-02',
        duration: 0,
        toJSON(): any {},
      },
    ];

    const spanContext = getSpanContextFromServerTiming(serverTimings);
    expect(spanContext).toBeUndefined();

    const emptyServerTimings: PerformanceServerTiming[] = [];
    const spanContextEmpty = getSpanContextFromServerTiming(emptyServerTimings);
    expect(spanContextEmpty).toBeUndefined();

    const undefinedServerTimings = undefined;
    const spanContextUndefined = getSpanContextFromServerTiming(undefinedServerTimings);
    expect(spanContextUndefined).toBeUndefined();
  });

  it('Returns 0 if the value is negative', () => {
    expect(createFaroResourceTiming({ fetchStart: 10, workerStart: 20 } as any).serviceWorkerTime).toBe('0');
    expect(createFaroResourceTiming({ fetchStart: 10, workerStart: 5 } as any).serviceWorkerTime).toBe('5');
    expect(createFaroResourceTiming({ initiatorType: 'initiatorType-test' } as any).initiatorType).toBe(
      'initiatorType-test'
    );
  });

  it('reports serviceWorkerTime as 0 when the request is not intercepted by a service worker (workerStart === 0)', () => {
    // Per the W3C Resource Timing spec, workerStart is 0 when no service worker handles the request.
    // fetchStart is a timeOrigin-relative timestamp (page age), not a duration, so fetchStart - 0
    // must not be reported as the service worker time.
    expect(createFaroResourceTiming({ fetchStart: 179315969, workerStart: 0 } as any).serviceWorkerTime).toBe('0');
  });
});
