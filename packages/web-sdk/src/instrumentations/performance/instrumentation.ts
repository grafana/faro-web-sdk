import { BaseInstrumentation, VERSION } from '@grafana/faro-core';

import { getNavigationTimings } from './navigation';
import { onDocumentReady, performanceObserverSupported } from './performanceUtils';
import { observeResourceTimings } from './resource';
import type { PerformanceInstrumentationOptions } from './types';

const DEFAULT_OPTIONS = {
  performanceResourceEntryAllowProperties: {
    initiatorType: ['xmlhttprequest', 'fetch'],
  },
};
export class PerformanceInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-performance';
  readonly version = VERSION;

  constructor(private options: PerformanceInstrumentationOptions = DEFAULT_OPTIONS) {
    super();
  }

  initialize() {
    if (!performanceObserverSupported()) {
      this.logDebug('performance observer not supported. Disable performance instrumentation.');
      return;
    }

    onDocumentReady(async () => {
      const pushEvent = this.api.pushEvent;
      const ignoredUrls = this.getIgnoreUrls();

      const { faroNavigationId } = await getNavigationTimings(pushEvent, ignoredUrls, {
        performanceEntryAllowProperties: this.options.performanceNavigationEntryAllowProperties,
      });

      if (faroNavigationId != null) {
        observeResourceTimings(faroNavigationId, pushEvent, ignoredUrls, {
          performanceEntryAllowProperties: this.options.performanceResourceEntryAllowProperties,
        });
      }
    });
  }

  private getIgnoreUrls(): Array<string | RegExp> {
    return this.transports.transports?.flatMap((transport) => transport.getIgnoreUrls());
  }
}
