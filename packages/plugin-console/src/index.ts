import { GrafanaFEAgentPlugin } from '@grafana/frontend-agent-core';

export const grafanaFEAgentPluginConsole: GrafanaFEAgentPlugin = {
  name: '@grafana/frontend-agent-plugin-console',
  initialize: () => {
    const patchConsole = (name: 'debug' | 'trace' | 'info' | 'log' | 'warn' | 'error') => {
      // eslint-disable-next-line no-console
      const original = console[name];

      // eslint-disable-next-line no-console
      console[name] = (...args) => {
        // eslint-disable-next-line no-console
        console.debug('console event', ...args);

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
