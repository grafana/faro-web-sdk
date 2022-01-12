import type { Plugin } from '@grafana/frontend-agent-core';

const plugin: Plugin = {
  name: '@grafana/frontend-agent-plugin-browser-meta',
  metas: () => ({
    page: () => ({
      href: location.href,
    }),
  }),
};

export default plugin;
