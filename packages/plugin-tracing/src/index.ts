import type { Plugin } from '@grafana/frontend-agent-core';

const plugin: Plugin = {
  name: '@grafana/frontend-agent-plugin-tracing',
  instrumentations: (agent) => {
    agent.logger.pushLog(['bla bla bla']);
  },
};

export default plugin;
