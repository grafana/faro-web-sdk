import { BaseInstrumentation, EVENT_ROUTE_CHANGE, VERSION } from '@grafana/faro-web-sdk';

import type { VueRouterInstrumentationOptions } from './types';

export class VueRouterInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-vue-router-instrumentation';
  readonly version = VERSION;

  constructor(private options: VueRouterInstrumentationOptions) {
    super();
  }

  initialize() {
    let navigationStartTime = performance.now();

    this.options.router.beforeEach(() => {
      navigationStartTime = performance.now();
    });

    this.options.router.afterEach((to, from) => {
      const duration = performance.now() - navigationStartTime;

      this.api.pushEvent(EVENT_ROUTE_CHANGE, {
        toRoute: to.matched[to.matched.length - 1]?.path ?? to.path,
        fromRoute: from.matched[from.matched.length - 1]?.path ?? from.path,
        toUrl: window.location.href,
        duration: duration.toString(),
      });
    });
  }
}
