import { createFaroNavigationTiming, createFaroResourceTiming } from './performanceUtils';
import { performanceNavigationEntry, performanceResourceEntry } from './performanceUtilsTestData';
import type { FaroNavigationTiming, FaroResourceTiming } from './types';

describe('performanceUtils', () => {
  it(`calculates navigation timing`, () => {
    const faroNavigationTiming = createFaroNavigationTiming(performanceNavigationEntry);
    expect(faroNavigationTiming).toStrictEqual({
      visibilityState: 'visible',
      duration: '2700',
      pageLoadTime: '2441',
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
});
