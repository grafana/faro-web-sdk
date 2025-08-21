import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

import type { Config, MeasurementsAPI } from '@grafana/faro-core';

export class WebVitalsBasic {
  static mapping = {
    cls: onCLS,
    fcp: onFCP,
    inp: onINP,
    lcp: onLCP,
    ttfb: onTTFB,
  };

  constructor(
    private pushMeasurement: MeasurementsAPI['pushMeasurement'],
    private webVitalConfig?: Config['webVitalsInstrumentation']
  ) {}

  initialize(): void {
    Object.entries(WebVitalsBasic.mapping).forEach(([indicator, executor]) => {
      executor(
        (metric) => {
          this.pushMeasurement({
            type: 'web-vitals',

            values: {
              [indicator]: metric.value,
            },
          });
        },
        { reportAllChanges: this.webVitalConfig?.reportAllChanges }
      );
    });
  }
}
