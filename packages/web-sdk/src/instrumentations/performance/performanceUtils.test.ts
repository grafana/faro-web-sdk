import { calculateFaroNavigationTiming, calculateFaroResourceTiming } from './performanceUtils';
import { performanceNavigationEntry } from './performanceUtilsTestData';
import type { FaroNavigationTiming, FaroResourceTiming } from './types';

describe('performanceUtils', () => {
  it(`calculates navigation timings`, () => {
    const faroNavigationTiming = calculateFaroNavigationTiming(performanceNavigationEntry);
    expect(faroNavigationTiming).toStrictEqual({
      visibilityState: 'visible',
      totalNavigationTime: '2700',
      pageLoadTime: '2441',
      documentProcessingDuration: '2158',
      domLoadTime: '1450',
      scriptProcessingDuration: '3',
      ttfb: '305',
      type: 'navigate',
    } as FaroNavigationTiming);
  });

  it(`calculates resource timings`, () => {
    const faroResourceTiming = calculateFaroResourceTiming(performanceNavigationEntry);
    expect(faroResourceTiming).toStrictEqual({
      name: 'http://example.com',
      tcpHandshakeTime: '53',
      dnsLookupTime: '139',
      tlsNegotiationTime: '33',
      redirectTime: '1',
      requestTime: '109',
      fetchTime: '305',
      serviceWorkerProcessingTime: '237',
      decodedBodySize: '530675',
      encodedBodySize: '126111',
      cacheHitStatus: 'fullLoad',
      renderBlockingStatus: 'unknown',
      protocol: 'h2',
      initiatorType: 'navigation',
    } as FaroResourceTiming);
  });

  it(`calculates cacheHitStatus`, () => {
    expect(calculateFaroResourceTiming({ transferSize: 0 } as any).cacheHitStatus).toBe('fullLoad');
    expect(calculateFaroResourceTiming({ transferSize: 1 } as any).cacheHitStatus).toBe('fullLoad');

    expect(calculateFaroResourceTiming({ transferSize: 0, decodedBodySize: 1 } as any).cacheHitStatus).toBe('cache');

    expect(calculateFaroResourceTiming({ transferSize: 1, encodedBodySize: 0 } as any).cacheHitStatus).toBe('fullLoad');
    expect(calculateFaroResourceTiming({ transferSize: 1, encodedBodySize: 1 } as any).cacheHitStatus).toBe('fullLoad');
    expect(calculateFaroResourceTiming({ transferSize: 1, encodedBodySize: 2 } as any).cacheHitStatus).toBe(
      'conditionalFetch'
    );

    // For browsers supporting the responseStatus property
    expect(
      calculateFaroResourceTiming({ transferSize: 1, encodedBodySize: 1, responseStatus: 200 } as any).cacheHitStatus
    ).toBe('fullLoad');
    expect(
      calculateFaroResourceTiming({ transferSize: 1, encodedBodySize: 1, responseStatus: 304 } as any).cacheHitStatus
    ).toBe('conditionalFetch');
  });

  it(`Sets renderBlockingStatus`, () => {
    // For browsers supporting the responseStatus property
    expect(calculateFaroResourceTiming({ renderBlockingStatus: 'blocking' } as any).renderBlockingStatus).toBe(
      'blocking'
    );

    // For browsers which do not support the responseStatus property
    expect(calculateFaroResourceTiming({} as any).renderBlockingStatus).toBe('unknown');
  });
});
