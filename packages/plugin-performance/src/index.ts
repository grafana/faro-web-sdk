import type { Agent, Plugin } from '@grafana/javascript-agent-core';
import { getCLS, getFCP, getFID, getLCP, getTTFB } from 'web-vitals';
import type { Metric } from 'web-vitals';

const getMarkValue = (indicator: string, agent: Agent) => {
  return (metric: Metric) => {
    agent.api.pushMeasurement({
      type: 'web-vitals',
      values: {
        [indicator]: metric.value,
      },
    });
  };
};

const plugin: Plugin = {
  name: '@grafana/javascript-agent-plugin-performance',
  instrumentations: async (agent) => {
    getCLS(getMarkValue('cls', agent));
    getFCP(getMarkValue('fcp', agent));
    getFID(getMarkValue('fid', agent));
    getLCP(getMarkValue('lcp', agent));
    getTTFB(getMarkValue('ttfb', agent));
  },
};

export default plugin;
