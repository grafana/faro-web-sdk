import { isString, isUndefined } from '@grafana/frontend-agent-core';
import type { Plugin } from '@grafana/frontend-agent-core';

const plugin: Plugin = {
  name: '@grafana/frontend-agent-plugin-error',
  instrumentations: (agent) => {
    window.onerror = (event, source, lineno, colno, error) => {
      // if (!isUndefined(error)) {
      //   agent.logger.pushExceptionFromError(event, source ?? '?', lineno ?? null, colno ?? null, error!);
      // } else if (isString(event)) {
      agent.logger.pushExceptionFromSource(event as string, source ?? '?', lineno ?? null, colno ?? null);
      // }
    };
  },
};

export default plugin;
