import { logger, Plugin } from '@grafana/frontend-agent-core';

/* eslint-disable no-console */

const plugin: Plugin = {
  name: '@grafana/frontend-agent-plugin-console',
  initialize: () => {
    const patchConsole = (name: 'debug' | 'trace' | 'info' | 'log' | 'warn' | 'error') => {
      const original = console[name];

      console[name] = (...args) => {
        logger.sendEvent(...args);

        original(...args);
      };
    };

    patchConsole('trace');
    patchConsole('info');
    patchConsole('log');
    patchConsole('warn');
    patchConsole('error');
  },
};

export default plugin;
