import { logger, Plugin } from '@grafana/frontend-agent-core';

const plugin: Plugin = {
  name: '@grafana/frontend-agent-plugin-error',
  initialize: () => {
    window.onerror = (...args) => {
      logger.sendEvent(...args);
    };
  },
};

export default plugin;
