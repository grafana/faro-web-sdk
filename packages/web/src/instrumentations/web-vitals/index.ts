import { agent } from '@grafana/agent-core';
import type { Instrumentation } from '@grafana/agent-core';
import { getCLS, getFCP, getFID, getLCP, getTTFB } from 'web-vitals';

import { VERSION } from './version';

const map = {
  cls: getCLS,
  fcp: getFCP,
  fid: getFID,
  lcp: getLCP,
  ttfb: getTTFB,
};

export const webVitalsInstrumentation: Instrumentation = {
  initialize: async () => {
    Object.entries(map).forEach(([indicator, executor]) => {
      executor((metric) => {
        agent.api.pushMeasurement({
          type: 'web-vitals',
          values: {
            [indicator]: metric.value,
          },
        });
      });
    });
  },
  name: '@grafana/agent-instrumentation-web-vitals',
  version: VERSION,
};
