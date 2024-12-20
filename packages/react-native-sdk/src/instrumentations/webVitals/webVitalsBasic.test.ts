import type { Metric } from 'web-vitals';

import { WebVitalsBasic } from './webVitalsBasic';

jest.mock('web-vitals', () => {
  type MetricName = Metric['name'];

  function createMetric(name: MetricName): Metric {
    return {
      name,
      value: 0.1,
      rating: 'good',
      delta: 0.1,
      id: 'id',
      entries: [],
      navigationType: 'navigate',
    };
  }

  return {
    onCLS: (cb: (metric: Metric) => void) => cb(createMetric('CLS')),
    onFCP: (cb: (metric: Metric) => void) => cb(createMetric('FCP')),
    onFID: (cb: (metric: Metric) => void) => cb(createMetric('FID')),
    onLCP: (cb: (metric: Metric) => void) => cb(createMetric('LCP')),
    onTTFB: (cb: (metric: Metric) => void) => cb(createMetric('TTFB')),
    onINP: (cb: (metric: Metric) => void) => cb(createMetric('INP')),
  };
});

describe('WebVitalsBasicInstrumentation', () => {
  it.each(['cls', 'fcp', 'fid', 'inp', 'lcp', 'ttfb'])('send %p metrics correctly', (metric) => {
    const pushMeasurement = jest.fn();
    new WebVitalsBasic(pushMeasurement).initialize();

    expect(pushMeasurement).toHaveBeenCalledWith({
      type: 'web-vitals',
      values: {
        [metric]: 0.1,
      },
    });
  });
});
