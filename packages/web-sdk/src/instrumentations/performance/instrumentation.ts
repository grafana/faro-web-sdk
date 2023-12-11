import { BaseInstrumentation, VERSION } from '@grafana/faro-core';

import { getNavigationTimings } from './navigation';
import { observeResourceTimings } from './resource';
import { onDocumentReady } from './util';

export class PerformanceInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-performance';
  readonly version = VERSION;

  initialize() {
    onDocumentReady(() => {
      const faroNavigationTiming = getNavigationTimings(this.api.pushEvent, this.getIgnoreUrls());
      observeResourceTimings(faroNavigationTiming as any, this.api.pushEvent, this.getIgnoreUrls());
    });
  }

  private getIgnoreUrls(): Array<string | RegExp> {
    return this.transports.transports?.flatMap((transport) => transport.getIgnoreUrls());
  }
}
