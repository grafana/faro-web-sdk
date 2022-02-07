import { agent } from '@grafana/javascript-agent-core';
import type { Instrumentation } from '@grafana/javascript-agent-core';
import { getCLS, getFCP, getFID, getLCP, getTTFB } from 'web-vitals';

const map = {
  cls: getCLS,
  fcp: getFCP,
  fid: getFID,
  lcp: getLCP,
  ttfb: getTTFB,
};

const webVitalsInstrumentation: Instrumentation = async () => {
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
};

export default webVitalsInstrumentation;
