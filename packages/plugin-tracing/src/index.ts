import type { Plugin } from '@grafana/javascript-agent-core';

const plugin: Plugin = {
  name: '@grafana/javascript-agent-plugin-tracing',
  instrumentations: (agent) => {
    agent.api.pushLog(['A simple log from the tracing plugin']);
  },
};

export default plugin;
