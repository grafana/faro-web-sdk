import { BaseInstrumentation, VERSION, faro, Observable } from '@grafana/faro-core';
import { monitorHttpRequests } from '../userActions/httpRequestMonitor';
import { monitorDomMutations } from '../userActions/domMutationMonitor';
import { monitorUrlChanges } from './urlChangeMonitor';
import EventsTracker from './eventsTracker';
import { monitorInteractions } from './interactionMonitor';

export class SoftNavigationInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-soft-navigation';
  readonly version = VERSION;

  override initialize(): void {
    const httpMonitor = monitorHttpRequests();
    const domMutationsMonitor = monitorDomMutations();
    const urlMonitor = monitorUrlChanges();
    const interactionMonitor = monitorInteractions(['pointerdown', 'keydown']);

    const tracker = new EventsTracker(interactionMonitor,
      new Observable().merge(httpMonitor, domMutationsMonitor, urlMonitor)
    );

    tracker
      .filter((msg) => {
        return msg.message == 'tracking-ended';
      })  
      .subscribe((msg) => {
        if (msg.events?.some((e: any) => e.type === 'url-change') && msg.events?.some((e: any) => e.type === 'dom-mutation'))
        {
          faro.api.pushEvent('soft-navigation', {
            from: msg.events?.find((e: any) => e.type === 'url-change')?.from,
            to: msg.events?.find((e: any) => e.type === 'url-change')?.to,
            trigger: msg.events?.find((e: any) => e.type === 'url-change')?.trigger,
            duration: msg.duration
          });
        }
      });
  }
}
