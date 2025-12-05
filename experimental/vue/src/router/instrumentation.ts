import { BaseInstrumentation, EVENT_ROUTE_CHANGE, VERSION } from '@grafana/faro-web-sdk';

import type { VueRouterInstrumentationOptions } from './types';

export class VueRouterInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-vue-router-instrumentation';
  readonly version = VERSION;

  constructor(private options: VueRouterInstrumentationOptions) {
    super();
  }

  initialize() {
    this.options.router.afterEach((to, from) => {
      this.api.pushEvent(EVENT_ROUTE_CHANGE, {
        toRoute: to.matched[to.matched.length - 1]?.path ?? to.path,
        fromRoute: from.matched[from.matched.length - 1]?.path ?? from.path,
        toUrl: window.location.href,
      });
    });
  }
}
