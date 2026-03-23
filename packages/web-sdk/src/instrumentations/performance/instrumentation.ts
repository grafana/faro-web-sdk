import { BaseInstrumentation, Observable, VERSION } from '@grafana/faro-core';

import { _sdkPrefix } from '../../consts';

import { getNavigationTimings } from './navigation';
import { onDocumentReady, performanceObserverSupported } from './performanceUtils';
import { observeResourceTimings } from './resource';
import type { ResourceEntryMessage } from './types';

export const performanceEntriesSubscription = new Observable<ResourceEntryMessage>();

export class PerformanceInstrumentation extends BaseInstrumentation {
  readonly name = `${_sdkPrefix}instrumentation-performance`;
  readonly version = VERSION;

  initialize() {
    if (!performanceObserverSupported()) {
      this.logDebug('performance observer not supported. Disable performance instrumentation.');
      return;
    }

    onDocumentReady(async () => {
      const pushEvent = this.api.pushEvent;

      const { faroNavigationId } = await getNavigationTimings(pushEvent);

      if (faroNavigationId != null) {
        observeResourceTimings(faroNavigationId, pushEvent, performanceEntriesSubscription);
      }
    });
  }
}
