import { pushExceptionFromError, pushExceptionFromSource } from '@grafana/frontend-agent-core';
import type { Plugin } from '@grafana/frontend-agent-core';

const plugin: Plugin = {
  name: '@grafana/frontend-agent-plugin-error',
  registerInstrumentation: () => {
    window.onerror = (event, source, lineno, colno, error) => {
      if (error) {
        pushExceptionFromError(error);
      } else {
        pushExceptionFromSource(event, source ?? '?', lineno ?? null, colno ?? null);
      }
    };
  },
};

export default plugin;
