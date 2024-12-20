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
      tcpHandshakeTime: '53',
      dnsLookupTime: '139',
      tlsNegotiationTime: '33',
      redirectTime: '1',
      requestTime: '109',
      responseTime: '0',
      responseStatus: '200',
      fetchTime: '305',
      serviceWorkerTime: '237',
      decodedBodySize: '530675',
      encodedBodySize: '126111',
      cacheHitStatus: 'fullLoad',
      renderBlockingStatus: 'unknown',
      protocol: 'h2',
      initiatorType: 'navigation',
    } as FaroNavigationTiming);
  });

  it(`calculates resource timings`, () => {
    const faroResourceTiming = createFaroResourceTiming(performanceResourceEntry);
    expect(faroResourceTiming).toStrictEqual({
      name: 'http://example.com/awesome-image',
      duration: '370',
      tcpHandshakeTime: '0',
      dnsLookupTime: '0',
      tlsNegotiationTime: '11',
      redirectTime: '0',
      requestTime: '359',
      responseTime: '0',
      responseStatus: '200',
      fetchTime: '370',
      serviceWorkerTime: '778',
      decodedBodySize: '10526',
      encodedBodySize: '10526',
      cacheHitStatus: 'fullLoad',
      renderBlockingStatus: 'unknown',
      protocol: 'h2',
      initiatorType: 'img',
      ttfb: '359',
      visibilityState: 'visible',
    } as FaroResourceTiming);
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
});
