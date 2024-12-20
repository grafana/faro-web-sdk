import { onCLS, onFCP, onFID, onINP, onLCP, onTTFB } from 'web-vitals';

import type { MeasurementsAPI } from '@grafana/faro-core';

export class WebVitalsBasic {
  static mapping = {
    cls: onCLS,
    fcp: onFCP,
    fid: onFID,
    inp: onINP,
    lcp: onLCP,
    ttfb: onTTFB,
  };

  constructor(private pushMeasurement: MeasurementsAPI['pushMeasurement']) {}

  initialize(): void {
    Object.entries(WebVitalsBasic.mapping).forEach(([indicator, executor]) => {
      executor((metric) => {
        this.pushMeasurement({
          type: 'web-vitals',

          values: {
            [indicator]: metric.value,
          },
        });
      });
    });
  }
}
