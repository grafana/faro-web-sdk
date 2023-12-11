import { BaseInstrumentation, VERSION } from '@grafana/faro-core';

import { observeNavigationTimings } from './navigation';
import { observeResourceTimings } from './resource';
import { onDocumentReady } from './util';

// all this does is send VIEW_CHANGED event
export class PerformanceInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-performance';
  readonly version = VERSION;

  initialize() {
    let resolveNavigationTimingReceived: (value: unknown) => void;

    onDocumentReady(async () => {
      let navigationTimingReceived = new Promise((resolve) => {
        resolveNavigationTimingReceived = resolve;
      });

      observeNavigationTimings(resolveNavigationTimingReceived, this.api.pushEvent, this.getIgnoreUrls());

      const currentNavigationTiming = await navigationTimingReceived;

      observeResourceTimings(currentNavigationTiming as any, this.api.pushEvent, this.getIgnoreUrls());
    });
  }

  private getIgnoreUrls(): Array<string | RegExp> {
    return this.transports.transports?.flatMap((transport) => transport.getIgnoreUrls());
  }

  //   const resources = performance.getEntriesByType("resource");
}
