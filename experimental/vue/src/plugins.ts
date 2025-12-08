import type { App } from 'vue';
import type { Router } from 'vue-router';

import { faro, LogLevel } from '@grafana/faro-web-sdk';

import { api } from './dependencies';
import { sendComponentPerformanceEvent } from './performance/utils';
import { VueRouterInstrumentation } from './router';

export interface FaroVuePluginOptions {
  /**
   * Whether to instrument all components for performance monitoring.
   * Adds a global mixin to track mount, update, and lifecycle durations.
   * @default true
   */
  instrumentComponents?: boolean;

  /**
   * Whether to instrument the global Vue error handler.
   * @default true
   */
  instrumentError?: boolean;

  /**
   * Whether to instrument the global Vue warning handler.
   * @default true
   */
  instrumentWarn?: boolean;

  /**
   * The Vue Router instance to instrument.
   * If provided, the router instrumentation will be initialized automatically.
   */
  router?: Router;
}

export const FaroVuePlugin = {
  install: (app: App, options: FaroVuePluginOptions = {}) => {
    const { instrumentComponents = true, instrumentError = true, instrumentWarn = true, router } = options;

    if (instrumentError) {
      const originalErrorHandler = app.config.errorHandler;

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
    }

    if (instrumentWarn) {
      const originalWarnHandler = app.config.warnHandler;

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
    }

    if (instrumentComponents) {
      app.mixin({
        beforeMount() {
          (this as any).$_faroMountStartTime = performance.now();
        },
        mounted() {
          const duration = performance.now() - (this as any).$_faroMountStartTime;
          const name = this.$options?.name || (this.$options as any)?.__name || 'Anonymous';

          sendComponentPerformanceEvent(name, 'mount', duration);

          (this as any).$_faroMountEndTime = performance.now();
        },
        beforeUpdate() {
          (this as any).$_faroUpdateStartTime = performance.now();
        },
        updated() {
          if ((this as any).$_faroUpdateStartTime !== undefined) {
            const duration = performance.now() - (this as any).$_faroUpdateStartTime;
            const name = this.$options?.name || (this.$options as any)?.__name || 'Anonymous';

            sendComponentPerformanceEvent(name, 'update', duration);

            (this as any).$_faroUpdateStartTime = undefined;
          }
        },
        unmounted() {
          if ((this as any).$_faroMountEndTime !== undefined) {
            const duration = performance.now() - (this as any).$_faroMountEndTime;
            const name = this.$options?.name || (this.$options as any)?.__name || 'Anonymous';

            sendComponentPerformanceEvent(name, 'lifecycle', duration);
          }
        },
      });
    }

    if (router) {
      faro.instrumentations.add(new VueRouterInstrumentation({ router }));
    }
  },
};
