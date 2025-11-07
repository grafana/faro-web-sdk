import { BaseInstrumentation, faro, Observable, VERSION } from '@grafana/faro-core';

import { ActivityWindowTracker, isRequestEndMessage, isRequestStartMessage } from '../_internal/activityWindowTracker';
import { monitorDomMutations } from '../_internal/monitors/domMutationMonitor';
import { monitorHttpRequests } from '../_internal/monitors/httpRequestMonitor';
import { monitorInteractions } from '../_internal/monitors/interactionMonitor';
import { monitorUrlChanges } from '../_internal/monitors/urlChangeMonitor';

export class NavigationInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-navigation';
  readonly version = VERSION;

  override initialize(): void {
    const httpMonitor = monitorHttpRequests();
    const domMutationsMonitor = monitorDomMutations();
    const urlMonitor = monitorUrlChanges();
    const interactionMonitor = monitorInteractions(['pointerdown', 'keydown']);

    const activityWindowTracker = new ActivityWindowTracker(
      new Observable().merge(httpMonitor, domMutationsMonitor, urlMonitor),
      {
        inactivityMs: 100,
        drainTimeoutMs: 10 * 1000,
        isOperationStart: (msg) => (isRequestStartMessage(msg) ? msg.request.requestId : undefined),
        isOperationEnd: (msg) => (isRequestEndMessage(msg) ? msg.request.requestId : undefined),
      }
    );

    activityWindowTracker
      .filter((msg) => {
        return msg.message === 'tracking-ended';
      })
      .subscribe((msg) => {
        if (
          msg.events?.some((e: any) => e.type === 'url-change') &&
          msg.events?.some((e: any) => e.type === 'dom-mutation')
        ) {
          const urlChange = msg.events?.find((e: any) => e.type === 'url-change');
          faro.api.pushEvent('faro.navigation', {
            fromUrl: urlChange?.from,
            toUrl: urlChange?.to,
            sameDocument: String(true),
            duration: msg.duration,
          });
        }
      });

    interactionMonitor.subscribe(() => {
      activityWindowTracker.startTracking();
    });
  }
}
