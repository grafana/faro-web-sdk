import type { Plugin } from '@grafana/frontend-agent-core';

const plugin: Plugin = {
  name: '@grafana/frontend-agent-plugin-performance',
  instrumentations: (agent) => {
    if (window.performance) {
      const performance = window.performance;
      const performanceEntries = performance.getEntriesByType('paint');
      performanceEntries.forEach((performanceEntry) => {
        agent.logger.pushLog([`The time to ${performanceEntry.name} was ${performanceEntry.startTime} milliseconds.`]);
      });
    }
  },
};

export default plugin;
