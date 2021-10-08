import { logger, Plugin, PluginTypes } from '@grafana/frontend-agent-core';

const plugin: Plugin = {
  name: '@grafana/frontend-agent-plugin-error',
  type: PluginTypes.INSTRUMENTATION,
  initialize: () => {
    window.onerror = (_event, _source, _lineno, _colno, error) => {
      logger.exception(error!);
    };
  },
};

export default plugin;
