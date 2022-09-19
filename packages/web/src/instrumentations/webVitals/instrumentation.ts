import { getCLS, getFCP, getFID, getINP, getLCP, getTTFB } from 'web-vitals';

import { BaseInstrumentation, VERSION } from '@grafana/agent-core';

export class WebVitalsInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/agent-web:instrumentation-web-vitals';
  readonly version = VERSION;

  static mapping = {
    cls: getCLS,
    fcp: getFCP,
    fid: getFID,
    inp: getINP,
    lcp: getLCP,
    ttfb: getTTFB,
  };

  initialize(): void {
    this.logDebug('Initializing');

    Object.entries(WebVitalsInstrumentation.mapping).forEach(([indicator, executor]) => {
      executor((metric) => {
        this.agent.api.pushMeasurement({
          type: 'web-vitals',
          values: {
            [indicator]: metric.value,
          },
        });
      });
    });
  }
}
