import { meta, Plugin, PluginTypes } from '@grafana/frontend-agent-core';

const plugin: Plugin = {
  name: '@grafana/frontend-agent-plugin-browser-meta',
  type: PluginTypes.META,
  initialize: () => {
    meta.set('browser', () => ({
      name: 'browser name',
      version: 'X.Y.Z',
      os: 'os name',
      mobile: false,
    }));
  },
};

export default plugin;
