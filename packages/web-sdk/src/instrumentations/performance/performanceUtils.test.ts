import { calculateNavigationTimings, calculateResourceTimings } from './performanceUtils';
import { navigationAndResourceEntries } from './performanceUtilsTestData';
import type { FaroNavigationTiming, FaroResourceTiming } from './types';

describe('performanceUtils', () => {
  it(`calculates navigation timings`, () => {
    const faroNavigationTiming = calculateNavigationTimings(navigationAndResourceEntries[0].toJSON());

    expect(faroNavigationTiming).toStrictEqual({
      totalNavigationTime: '800',
      visibilityState: 'visible',
      documentProcessingDuration: '525',
      pagLoadTime: '542',
      scriptProcessingDuration: '7',
      pageChildrenProcessingDuration: '10',
      ttfb: '34',
    } as FaroNavigationTiming);
  });

  it(`calculates resource timings`, () => {
    const faroNavigationTiming = calculateResourceTimings(navigationAndResourceEntries[0].toJSON());

    expect(faroNavigationTiming).toStrictEqual({
      tcpHandshakeTime: '1',
      dnsLookupTime: '1',
      tlsNegotiationTime: '25',
      redirectLookupTime: '1',
      requestTime: '10',
      fetchTime: '34',
      serviceWorkerProcessingTime: '1',
      isCompressed: 'true',
      isCacheHit: 'false',
      renderBlocking: 'unknown',
      protocol: 'http/1.1',
      is304: 'true',
    } as FaroResourceTiming);
  });

  expect(calculateResourceTimings({ transferSize: 1 }).isCacheHit).toBe(true);
  expect(calculateResourceTimings({ encodedBodySize: 0 }).isCacheHit).toBe(false);
  expect(calculateResourceTimings({ encodedBodySize: 1, transferSize: 0 }).isCacheHit).toBe(false);
  expect(calculateResourceTimings({ encodedBodySize: 1, transferSize: 1 }).isCacheHit).toBe(false);
  expect(calculateResourceTimings({ encodedBodySize: 2, transferSize: 1 }).isCacheHit).toBe(true);
});
