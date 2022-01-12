import type { Plugin } from '@grafana/frontend-agent-core';

const plugin: Plugin = {
  name: '@grafana/frontend-agent-plugin-browser-meta',
  metas: () => ({
    browser: () => ({
      userAgent: navigator.userAgent,
    }),
  }),
};

export default plugin;
