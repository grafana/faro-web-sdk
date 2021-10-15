import { pushLog } from '@grafana/frontend-agent-core';
import type { Plugin } from '@grafana/frontend-agent-core';

const plugin: Plugin = {
  name: '@grafana/frontend-agent-plugin-performance',
  registerInstrumentation: () => {
    if (window.performance) {
      const performance = window.performance;
      const performanceEntries = performance.getEntriesByType('paint');
      performanceEntries.forEach((performanceEntry) => {
        pushLog([`The time to ${performanceEntry.name} was ${performanceEntry.startTime} milliseconds.`]);
      });
    }
  },
};

export default plugin;
