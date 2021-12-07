import type { Plugin } from '@grafana/frontend-agent-core';

import { registerOnerror } from './registerOnerror';
import { registerOnunhandledrejection } from './registerOnunhandledrejection';

const plugin: Plugin = {
  name: '@grafana/frontend-agent-plugin-error',
  instrumentations: (agent) => {
    registerOnerror(agent);
    registerOnunhandledrejection(agent);
  },
};

export default plugin;
