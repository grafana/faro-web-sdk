import type { MetricWithAttribution } from 'web-vitals/attribution';

import { WebVitalsWithAttribution } from './webVitalsWithAttribution';

jest.mock('web-vitals/attribution', () => {
  type MetricName = MetricWithAttribution['name'];
  type MetricAttribution = MetricWithAttribution['attribution'];

  function createMetric(name: MetricName, attribution: MetricAttribution): MetricWithAttribution {
    return {
      name,
      value: 0.1,
      rating: 'good',
      delta: 0.1,
      id: 'id',
      entries: [],
      navigationType: 'navigate',
      attribution,
    } as MetricWithAttribution;
  }

  return {
    onCLS: (cb: (metric: MetricWithAttribution) => void) => {
      cb(
        createMetric('CLS', {
          largestShiftValue: 0.1,
          largestShiftTime: 0.1,
          largestShiftTarget: 'target',
          loadState: 'loading',
        })
      );
    },
    onFCP: (cb: (metric: MetricWithAttribution) => void) => {
      cb(
        createMetric('FCP', {
          firstByteToFCP: 0.1,
          timeToFirstByte: 0.1,
          loadState: 'loading',
        })
      );
    },
    onFID: (cb: (metric: MetricWithAttribution) => void) => {
      cb(
        createMetric('FID', {
          eventTime: 0.1,
          eventTarget: 'target',
          eventType: 'type',
          loadState: 'loading',
        })
      );
    },
    onLCP: (cb: (metric: MetricWithAttribution) => void) => {
      cb(
        createMetric('LCP', {
          elementRenderDelay: 0.1,
          resourceLoadDelay: 0.1,
          resourceLoadDuration: 0.1,
          timeToFirstByte: 0.1,
          element: 'element',
        })
      );
    },
    onTTFB: (cb: (metric: MetricWithAttribution) => void) => {
      cb(
        createMetric('TTFB', {
          dnsDuration: 0.1,
          connectionDuration: 0.1,
          requestDuration: 0.1,
          waitingDuration: 0.1,
          cacheDuration: 0.1,
        })
      );
    },
    onINP: (cb: (metric: MetricWithAttribution) => void) => {
      cb(
        createMetric('INP', {
          eventTime: 0.1,
          interactionTarget: 'target',
          interactionType: 'pointer',
          loadState: 'loading',
          interactionTime: 0.1,
        })
      );
    },
  };
});

describe('WebVitalsWithAttributionInstrumentation', () => {
  it('send cls metrics correctly', () => {
    const pushMeasurement = jest.fn();
    new WebVitalsWithAttribution(pushMeasurement).initialize();

    const values = {
      cls: 0.1,
      largest_shift_value: 0.1,
      largest_shift_time: 0.1,
      delta: 0.1,
    };

    const context = {
      navigation_entry_id: 'unknown',
      navigation_type: 'navigate',
      id: 'id',
      largest_shift_target: 'target',
      load_state: 'loading',
      rating: 'good',
    };

    expect(pushMeasurement).toHaveBeenCalledWith(
      {
        type: 'web-vitals',
        values,
      },
      { context }
    );
  });

  it('send fcp metrics correctly', () => {
    const pushMeasurement = jest.fn();
    new WebVitalsWithAttribution(pushMeasurement).initialize();

    const values = {
      fcp: 0.1,
      delta: 0.1,
      first_byte_to_fcp: 0.1,
      time_to_first_byte: 0.1,
    };

    const context = {
      id: 'id',
      navigation_entry_id: 'unknown',
      navigation_type: 'navigate',
      rating: 'good',
      load_state: 'loading',
    };

    expect(pushMeasurement).toHaveBeenCalledWith(
      {
        type: 'web-vitals',
        values,
      },
      { context }
    );
  });

  it('send fid metrics correctly', () => {
    const pushMeasurement = jest.fn();
    new WebVitalsWithAttribution(pushMeasurement).initialize();

    const values = {
      fid: 0.1,
      delta: 0.1,
      event_time: 0.1,
    };

    const context = {
      id: 'id',
      navigation_entry_id: 'unknown',
      navigation_type: 'navigate',
      rating: 'good',
      event_target: 'target',
      event_type: 'type',
      load_state: 'loading',
    };

    expect(pushMeasurement).toHaveBeenCalledWith(
      {
        type: 'web-vitals',
        values,
      },
      { context }
    );
  });

  it('send inp metrics correctly', () => {
    const pushMeasurement = jest.fn();
    new WebVitalsWithAttribution(pushMeasurement).initialize();

    const values = {
      inp: 0.1,
      delta: 0.1,
      interaction_time: 0.1,
    };

    const context = {
      id: 'id',
      navigation_entry_id: 'unknown',
      navigation_type: 'navigate',
      rating: 'good',
      interaction_target: 'target',
      interaction_type: 'pointer',
      load_state: 'loading',
    };

    expect(pushMeasurement).toHaveBeenCalledWith(
      {
        type: 'web-vitals',
        values,
      },
      { context }
    );
  });

  it('send lcp metrics correctly', () => {
    const pushMeasurement = jest.fn();
    new WebVitalsWithAttribution(pushMeasurement).initialize();

    const values = {
      lcp: 0.1,
      delta: 0.1,
      element_render_delay: 0.1,
      resource_load_delay: 0.1,
      resource_load_duration: 0.1,
      time_to_first_byte: 0.1,
    };

    const context = {
      id: 'id',
      navigation_entry_id: 'unknown',
      navigation_type: 'navigate',
      rating: 'good',
      element: 'element',
    };

    expect(pushMeasurement).toHaveBeenCalledWith(
      {
        type: 'web-vitals',
        values,
      },
      { context }
    );
  });

  it('send ttfb metrics correctly', () => {
    const pushMeasurement = jest.fn();
    new WebVitalsWithAttribution(pushMeasurement).initialize();

    const values = {
      ttfb: 0.1,
      delta: 0.1,
      cache_duration: 0.1,
      dns_duration: 0.1,
      connection_duration: 0.1,
      request_duration: 0.1,
      waiting_duration: 0.1,
    };

    const context = {
      rating: 'good',
      id: 'id',
      navigation_entry_id: 'unknown',
      navigation_type: 'navigate',
    };

    expect(pushMeasurement).toHaveBeenCalledWith(
      {
        type: 'web-vitals',
        values,
      },
      { context }
    );
  });
});
