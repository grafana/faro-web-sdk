import type { Plugin } from '@grafana/frontend-agent-core';
import { getCLS, getFCP, getFID, getLCP, getTTFB } from 'web-vitals';
import type { Metric } from 'web-vitals';

const plugin: Plugin = {
  name: '@grafana/frontend-agent-plugin-performance',
  instrumentations: async (agent) => {
    const values: any = {};

    const getMarkValue = (indicator: string) => {
      return (metric: Metric) => {
        values[indicator] = metric.value;
      };
    };

    getCLS(getMarkValue('cls'));
    getFCP(getMarkValue('fcp'));
    getFID(getMarkValue('fid'));
    getLCP(getMarkValue('lcp'));
    getTTFB(getMarkValue('ttfb'));

    window.onunload = () => {
      agent.commander.pushMeasurement({
        type: 'web-vitals',
        values,
      });
    };
  },
};

export default plugin;
