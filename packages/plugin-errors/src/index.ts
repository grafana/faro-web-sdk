import { logger } from '@grafana/frontend-agent-core';
import type { Plugin } from '@grafana/frontend-agent-core';

const plugin: Plugin = {
  name: '@grafana/frontend-agent-plugin-error',
  registerInstrumentation: () => {
    window.onerror = (_event, _source, _lineno, _colno, error) => {
      logger.exception(error!);
    };
  },
};

export default plugin;
