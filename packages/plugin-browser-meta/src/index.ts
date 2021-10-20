import type { Plugin } from '@grafana/frontend-agent-core';

const plugin: Plugin = {
  name: '@grafana/frontend-agent-plugin-browser-meta',
  metas: () => {
    return {
      browser: () => ({
        name: 'browser name',
        version: 'X.Y.Z',
        os: 'os name',
        mobile: false,
      }),
    };
  },
};

export default plugin;
