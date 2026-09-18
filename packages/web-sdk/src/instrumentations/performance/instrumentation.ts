import { BaseInstrumentation, Observable, VERSION } from '@grafana/faro-core';

import { getNavigationTimings } from './navigation';
import { onDocumentReady, performanceObserverSupported } from './performanceUtils';
import { observeResourceTimings } from './resource';
import type { ResourceEntryMessage } from './types';

export const performanceEntriesSubscription: Observable<ResourceEntryMessage> = new Observable<ResourceEntryMessage>();

export class PerformanceInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-performance';
  readonly version: string = VERSION;
  private cancelInitialization: (() => void) | undefined;

  initialize(): void {
    if (!performanceObserverSupported()) {
      this.logDebug('performance observer not supported. Disable performance instrumentation.');
      return;
    }

    let cancelled = false;
    const startObserving = () => {
      onDocumentReady(async () => {
        if (cancelled) {
          return;
        }
        const pushEvent = this.api.pushEvent;

        const { faroNavigationId } = await getNavigationTimings(pushEvent);

        if (!cancelled && faroNavigationId != null) {
          observeResourceTimings(faroNavigationId, pushEvent, performanceEntriesSubscription);
        }
      });
    };
    this.cancelInitialization = () => {
      cancelled = true;
      document.removeEventListener('prerenderingchange', startObserving);
    };

    if ((document as Document & { prerendering?: boolean }).prerendering) {
      // Read buffered navigation timings after activation so the event and its
      // stored navigation ID survive, and resource events can refer back to it.
      document.addEventListener('prerenderingchange', startObserving, { once: true });
    } else {
      startObserving();
    }
  }

  destroy(): void {
    this.cancelInitialization?.();
    this.cancelInitialization = undefined;
  }
}
