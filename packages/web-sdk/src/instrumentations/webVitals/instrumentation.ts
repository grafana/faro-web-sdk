import { onCLS, onFCP, onFID, onINP, onLCP, onTTFB } from 'web-vitals';

import { BaseInstrumentation, VERSION } from '@grafana/faro-core';

export class WebVitalsInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-web-vitals';
  readonly version = VERSION;

  static mapping = {
    cls: onCLS,
    fcp: onFCP,
    fid: onFID,
    inp: onINP,
    lcp: onLCP,
    ttfb: onTTFB,
  };

  initialize(): void {
    this.logDebug('Initializing');

    Object.entries(WebVitalsInstrumentation.mapping).forEach(([indicator, executor]) => {
      executor((metric) => {
        this.api.pushMeasurement({
          type: 'web-vitals',

          values: {
            [indicator]: metric.value,
          },
        });
      });
    });
  }
}
