import { BaseInstrumentation, VERSION } from '@grafana/faro-core';
import type { Patterns } from '@grafana/faro-core';

import { getNavigationTimings } from './navigation';
import { onDocumentReady, performanceObserverSupported } from './performanceUtils';
import { observeResourceTimings } from './resource';

export class PerformanceInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-performance';
  readonly version = VERSION;

  initialize() {
    if (!performanceObserverSupported()) {
      this.logDebug('performance observer not supported. Disable performance instrumentation.');
      return;
    }

    onDocumentReady(async () => {
      const pushEvent = this.api.pushEvent;
      const ignoredUrls = this.getIgnoreUrls();

      const { faroNavigationId } = await getNavigationTimings(pushEvent, ignoredUrls);

      if (faroNavigationId != null) {
        observeResourceTimings(faroNavigationId, pushEvent, ignoredUrls);
      }
    });
  }

  private getIgnoreUrls(): Patterns {
    return this.transports.transports?.flatMap((transport) => transport.getIgnoreUrls());
  }
}
