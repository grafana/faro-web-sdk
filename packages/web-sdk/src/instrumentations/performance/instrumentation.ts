import { BaseInstrumentation, VERSION } from '@grafana/faro-core';

import { observeAndGetNavigationTimings } from './navigation';
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

      const { faroNavigationId } = await observeAndGetNavigationTimings(pushEvent, ignoredUrls);

      if (faroNavigationId != null) {
        observeResourceTimings(faroNavigationId, pushEvent, ignoredUrls);
      }
    });
  }

  private getIgnoreUrls(): Array<string | RegExp> {
    return this.transports.transports?.flatMap((transport) => transport.getIgnoreUrls());
  }
}
