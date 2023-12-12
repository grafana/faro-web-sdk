import { BaseInstrumentation, VERSION } from '@grafana/faro-core';

import { getNavigationTimings } from './navigation';
import { onDocumentReady, performanceObserverSupported } from './performanceUtils';
import { observeResourceTimings } from './resource';

export class PerformanceInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-performance';
  readonly version = VERSION;

  initialize() {
    if (!performanceObserverSupported()) {
      return;
    }

    onDocumentReady(async () => {
      const faroNavigationEntry = await getNavigationTimings(this.api.pushEvent, this.getIgnoreUrls());

      observeResourceTimings(faroNavigationEntry, this.api.pushEvent, this.getIgnoreUrls());
    });
  }

  private getIgnoreUrls(): Array<string | RegExp> {
    return this.transports.transports?.flatMap((transport) => transport.getIgnoreUrls());
  }
}
