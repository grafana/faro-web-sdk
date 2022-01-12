import type { Plugin } from '@grafana/frontend-agent-core';
import { getCLS, getFCP, getFID, getLCP, getTTFB } from 'web-vitals';
import type { Metric } from 'web-vitals';

const plugin: Plugin = {
  name: '@grafana/frontend-agent-plugin-performance',
  instrumentations: async (agent) => {
    const getMarkValue = (indicator: string) => {
      return (metric: Metric) => {
        agent.commander.pushMeasurement({
          type: 'page load',
          values: {
            [indicator]: metric.value,
          },
        });
      };
    };

    getCLS(getMarkValue('cls'));
    getFCP(getMarkValue('fcp'));
    getFID(getMarkValue('fid'));
    getLCP(getMarkValue('lcp'));
    getTTFB(getMarkValue('ttfb'));
  },
};

export default plugin;
