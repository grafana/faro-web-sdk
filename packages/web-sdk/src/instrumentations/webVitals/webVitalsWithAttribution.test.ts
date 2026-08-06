import { onINP, onLCP } from 'web-vitals/attribution';
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
    onLCP: jest.fn((cb: (metric: MetricWithAttribution) => void) => {
      cb(
        createMetric('LCP', {
          elementRenderDelay: 0.1,
          resourceLoadDelay: 0.1,
          resourceLoadDuration: 0.1,
          timeToFirstByte: 0.1,
          target: 'element',
          url: 'https://example.com/hero.png',
          lcpResourceEntry: { deliveryType: 'cache', initiatorType: 'img' } as unknown as PerformanceResourceTiming,
        })
      );
    }),
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
    onINP: jest.fn((cb: (metric: MetricWithAttribution) => void) => {
      cb(
        createMetric('INP', {
          interactionTarget: 'target',
          interactionType: 'pointer',
          loadState: 'loading',
          interactionTime: 0.1,
        })
      );
    }),
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

  describe('inp', () => {
    afterEach(() => {
      (onINP as jest.Mock).mockClear();
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

    const mockInpWithLongestScript = (attributionOverrides: Record<string, unknown> = {}) => {
      (onINP as jest.Mock).mockImplementationOnce((cb: (metric: MetricWithAttribution) => void) => {
        cb({
          name: 'INP',
          value: 0.1,
          rating: 'good',
          delta: 0.1,
          id: 'id',
          entries: [],
          navigationType: 'navigate',
          attribution: {
            interactionTarget: 'target',
            interactionType: 'pointer',
            loadState: 'loading',
            interactionTime: 0.1,
            totalScriptDuration: 12,
            totalStyleAndLayoutDuration: 3,
            totalPaintDuration: 2,
            totalUnattributedDuration: 1,
            longestScript: {
              subpart: 'processing-duration',
              intersectingDuration: 8,
              entry: {
                invoker: 'https://example.com/app.js',
                invokerType: 'classic-script',
                sourceURL: 'https://example.com/app.js',
                sourceFunctionName: 'handleClick',
                sourceCharPosition: 0,
              },
            },
            ...attributionOverrides,
          },
        } as unknown as MetricWithAttribution);
      });
    };

    it('adds non-sensitive LoAF-based attribution fields when longestScript is present, but not the gated source fields (opt-in off)', () => {
      mockInpWithLongestScript();

      const pushMeasurement = jest.fn();
      new WebVitalsWithAttribution(pushMeasurement).initialize();

      const values = {
        inp: 0.1,
        delta: 0.1,
        interaction_time: 0.1,
        total_script_duration: 12,
        total_style_and_layout_duration: 3,
        total_paint_duration: 2,
        total_unattributed_duration: 1,
        longest_script_intersecting_duration: 8,
      };

      const context = {
        id: 'id',
        navigation_entry_id: 'unknown',
        navigation_type: 'navigate',
        rating: 'good',
        interaction_target: 'target',
        interaction_type: 'pointer',
        load_state: 'loading',
        longest_script_subpart: 'processing-duration',
        longest_script_invoker_type: 'classic-script',
      };

      expect(pushMeasurement).toHaveBeenCalledWith(
        {
          type: 'web-vitals',
          values,
        },
        { context }
      );
    });

    it('adds the gated LoAF source attribution fields when trackAttributionSources is enabled', () => {
      mockInpWithLongestScript();

      const pushMeasurement = jest.fn();
      new WebVitalsWithAttribution(pushMeasurement, { trackAttributionSources: true }).initialize();

      const values = {
        inp: 0.1,
        delta: 0.1,
        interaction_time: 0.1,
        total_script_duration: 12,
        total_style_and_layout_duration: 3,
        total_paint_duration: 2,
        total_unattributed_duration: 1,
        longest_script_intersecting_duration: 8,
      };

      const context = {
        id: 'id',
        navigation_entry_id: 'unknown',
        navigation_type: 'navigate',
        rating: 'good',
        interaction_target: 'target',
        interaction_type: 'pointer',
        load_state: 'loading',
        longest_script_subpart: 'processing-duration',
        longest_script_invoker_type: 'classic-script',
        longest_script_invoker: 'https://example.com/app.js',
        longest_script_source_url: 'https://example.com/app.js',
        longest_script_source_function_name: 'handleClick',
        longest_script_source_char_position: '0',
      };

      expect(pushMeasurement).toHaveBeenCalledWith(
        {
          type: 'web-vitals',
          values,
        },
        { context }
      );
    });

    it('keeps zero-valued LoAF duration fields in the INP attribution values', () => {
      (onINP as jest.Mock).mockImplementationOnce((cb: (metric: MetricWithAttribution) => void) => {
        cb({
          name: 'INP',
          value: 0.1,
          rating: 'good',
          delta: 0.1,
          id: 'id',
          entries: [],
          navigationType: 'navigate',
          attribution: {
            interactionTarget: 'target',
            interactionType: 'pointer',
            loadState: 'loading',
            interactionTime: 0.1,
            totalScriptDuration: 0,
            totalStyleAndLayoutDuration: 0,
            totalPaintDuration: 0,
            totalUnattributedDuration: 0,
            longestScript: {
              subpart: 'processing-duration',
              intersectingDuration: 0,
              entry: {
                invoker: 'https://example.com/app.js',
                invokerType: 'classic-script',
                sourceURL: 'https://example.com/app.js',
                sourceFunctionName: 'handleClick',
                sourceCharPosition: 0,
              },
            },
          },
        } as unknown as MetricWithAttribution);
      });

      const pushMeasurement = jest.fn();
      new WebVitalsWithAttribution(pushMeasurement).initialize();

      const [event] = pushMeasurement.mock.calls.find(([evt]: [{ values: Record<string, unknown> }]) =>
        Object.prototype.hasOwnProperty.call(evt.values, 'inp')
      )!;

      expect(event.values).toMatchObject({
        total_script_duration: 0,
        total_style_and_layout_duration: 0,
        total_paint_duration: 0,
        total_unattributed_duration: 0,
        longest_script_intersecting_duration: 0,
      });

      expect(event.values).toHaveProperty('total_script_duration');
      expect(event.values).toHaveProperty('total_style_and_layout_duration');
      expect(event.values).toHaveProperty('total_paint_duration');
      expect(event.values).toHaveProperty('total_unattributed_duration');
      expect(event.values).toHaveProperty('longest_script_intersecting_duration');
    });

    it('does not send LoAF-based fields when longestScript is absent', () => {
      const pushMeasurement = jest.fn();
      new WebVitalsWithAttribution(pushMeasurement).initialize();

      const [, options] = pushMeasurement.mock.calls.find(([event]: [{ values: Record<string, unknown> }]) =>
        Object.prototype.hasOwnProperty.call(event.values, 'inp')
      )!;

      expect(options.context).not.toHaveProperty('longest_script_subpart');
      expect(options.context).not.toHaveProperty('longest_script_invoker');
      expect(options.context).not.toHaveProperty('longest_script_invoker_type');
      expect(options.context).not.toHaveProperty('longest_script_source_url');
      expect(options.context).not.toHaveProperty('longest_script_source_function_name');
      expect(options.context).not.toHaveProperty('longest_script_source_char_position');
    });
  });

  describe('lcp', () => {
    afterEach(() => {
      (onLCP as jest.Mock).mockClear();
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

    it('does not include resource attribution by default (opt-in off)', () => {
      const pushMeasurement = jest.fn();
      new WebVitalsWithAttribution(pushMeasurement, {}).initialize();

      const [, options] = pushMeasurement.mock.calls.find(([event]: [{ values: Record<string, unknown> }]) =>
        Object.prototype.hasOwnProperty.call(event.values, 'lcp')
      )!;

      expect(options.context).not.toHaveProperty('resource_url');
      expect(options.context).not.toHaveProperty('resource_delivery_type');
      expect(options.context).not.toHaveProperty('resource_initiator_type');
    });

    it('includes resource attribution when trackAttributionSources is enabled', () => {
      const pushMeasurement = jest.fn();
      new WebVitalsWithAttribution(pushMeasurement, { trackAttributionSources: true }).initialize();

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
        resource_url: 'https://example.com/hero.png',
        resource_delivery_type: 'cache',
        resource_initiator_type: 'img',
      };

      expect(pushMeasurement).toHaveBeenCalledWith(
        {
          type: 'web-vitals',
          values,
        },
        { context }
      );
    });

    it('omits resource_delivery_type when deliveryType is an empty string, even when opted in', () => {
      (onLCP as jest.Mock).mockImplementationOnce((cb: (metric: MetricWithAttribution) => void) => {
        cb({
          name: 'LCP',
          value: 0.1,
          rating: 'good',
          delta: 0.1,
          id: 'id',
          entries: [],
          navigationType: 'navigate',
          attribution: {
            elementRenderDelay: 0.1,
            resourceLoadDelay: 0.1,
            resourceLoadDuration: 0.1,
            timeToFirstByte: 0.1,
            target: 'element',
            url: 'https://example.com/hero.png',
            lcpResourceEntry: { deliveryType: '', initiatorType: 'img' } as unknown as PerformanceResourceTiming,
          },
        } as unknown as MetricWithAttribution);
      });

      const pushMeasurement = jest.fn();
      new WebVitalsWithAttribution(pushMeasurement, { trackAttributionSources: true }).initialize();

      const [, options] = pushMeasurement.mock.calls.find(([event]: [{ values: Record<string, unknown> }]) =>
        Object.prototype.hasOwnProperty.call(event.values, 'lcp')
      )!;

      expect(options.context).toMatchObject({
        resource_url: 'https://example.com/hero.png',
        resource_initiator_type: 'img',
      });
      expect(options.context).not.toHaveProperty('resource_delivery_type');
    });
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
