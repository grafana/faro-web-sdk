import type { App } from 'vue';

import { LogLevel } from '@grafana/faro-web-sdk';

import { api } from './dependencies';

export const FaroVuePlugin = {
  install: (app: App) => {
    const originalErrorHandler = app.config.errorHandler;
    const originalWarnHandler = app.config.warnHandler;

    app.config.errorHandler = (err, instance, info) => {
      const error = err instanceof Error ? err : new Error(String(err));

      api?.pushError(error, {
        type: 'vue_error',
        context: {
          info,
          component: instance?.$options?.name || (instance?.$options as any)?.__name || 'Anonymous',
        },
      });

      originalErrorHandler?.(err, instance, info);
    };

    app.config.warnHandler = (msg, instance, trace) => {
      api?.pushLog([msg], {
        level: LogLevel.WARN,
        context: {
          trace,
          component: instance?.$options?.name || (instance?.$options as any)?.__name || 'Anonymous',
        },
      });

      originalWarnHandler?.(msg, instance, trace);
    };
  },
};
