import { GrafanaFEAgentPlugin } from '@grafana/frontend-agent-core';

export const grafanaFEAgentPluginErrors: GrafanaFEAgentPlugin = {
  name: '@grafana/frontend-agent-plugin-error',
  initialize: () => {
    window.onerror = (...args) => {
      // eslint-disable-next-line no-console
      console.debug(`onerror event`, args);
    };
  },
};
