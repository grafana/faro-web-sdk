import type { Plugin } from '@grafana/javascript-agent-core';

import { registerOnerror } from './registerOnerror';
import { registerOnunhandledrejection } from './registerOnunhandledrejection';

const plugin: Plugin = {
  name: '@grafana/javascript-agent-plugin-error',
  instrumentations: (agent) => {
    registerOnerror(agent);
    registerOnunhandledrejection(agent);
  },
};

export default plugin;
