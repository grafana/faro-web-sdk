import { BaseInstrumentation, VERSION } from '@grafana/agent-core';
import { getCLS, getFCP, getFID, getLCP, getTTFB } from 'web-vitals';

const map = {
  cls: getCLS,
  fcp: getFCP,
  fid: getFID,
  lcp: getLCP,
  ttfb: getTTFB,
};

export class WebVitalsInstrumentation extends BaseInstrumentation {
  initialize(): void {
    Object.entries(map).forEach(([indicator, executor]) => {
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
  name = '@grafana/agent-web:instrumentation-web-vitals';
  version = VERSION;
}
