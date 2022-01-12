import type { Plugin } from '@grafana/frontend-agent-core';

const plugin: Plugin = {
  name: '@grafana/frontend-agent-plugin-tracing',
  instrumentations: (agent) => {
    agent.commander.pushLog(['A simple log from the tracing plugin']);
  },
};

export default plugin;
