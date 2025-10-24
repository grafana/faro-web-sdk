import { BaseInstrumentation, VERSION, faro, Observable } from '@grafana/faro-core';
import { ActivityWindowTracker } from '../_internal/activityWindowTracker';
import { monitorHttpRequests } from '../_internal/monitors/httpRequestMonitor';
import { monitorDomMutations } from '../_internal/monitors/domMutationMonitor';
import { monitorUrlChanges } from '../_internal/monitors/urlChangeMonitor';
import { monitorInteractions } from '../_internal/monitors/interactionMonitor';
import { isRequestStartMessage } from '../_internal/activityWindowTracker';
import { isRequestEndMessage } from './eventsTracker';

export class SoftNavigationInstrumentation extends BaseInstrumentation {
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
        followUpMs: 100,
        haltMs: 10 * 1000,
        isBlockingStart: (msg) => (isRequestStartMessage(msg) ? msg.request.requestId : undefined),
        isBlockingEnd: (msg) => (isRequestEndMessage(msg) ? msg.request.requestId : undefined),
      }
    );

    activityWindowTracker.subscribe((msg) => {
      if (msg.message == 'tracking-ended') {
        faro.api.pushEvent('navigation', {
          from: msg.events?.find((e: any) => e.type === 'url-change')?.from,
          to: msg.events?.find((e: any) => e.type === 'url-change')?.to,
          trigger: msg.events?.find((e: any) => e.type === 'url-change')?.trigger,
          duration: msg.duration
        });
      }
    });

    interactionMonitor.subscribe(() => {
      activityWindowTracker.startTracking();
    });
  }
}
