import type { Plugin } from '@grafana/javascript-agent-core';

const plugin: Plugin = {
  name: '@grafana/javascript-agent-plugin-page-meta',
  metas: () => ({
    page: () => ({
      href: location.href,
    }),
  }),
};

export default plugin;
