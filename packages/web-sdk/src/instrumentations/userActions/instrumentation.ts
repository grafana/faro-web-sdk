import { BaseInstrumentation, merge, Subscription, VERSION } from '@grafana/faro-core';

import { isClickableElement } from '../../utils';

import { monitorDomMutations } from './domMutationMonitor';
import { monitorHttpRequests } from './httpRequestMonitor';
import { monitorPerformanceEntries } from './performanceEntriesMonitor';

export class UserActionInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-user-action';
  readonly version = VERSION;

  initialize(): void {
    const httpMonitor = monitorHttpRequests();
    const domMutationsMonitor = monitorDomMutations();
    const performanceEntriesMonitor = monitorPerformanceEntries();
    // const allMonitors = merge(httpMonitor, domMutationsMonitor, performanceEntriesMonitor);

    // let allMonitorsSub: Subscription | undefined = allMonitors.subscribe((data) => {
    //   //   this.api.pushLog(data);
    //   console.log('User action data:', data);
    // });

    let timeoutId: number | undefined;
    function startTimeout(cb?: () => void) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      //@ts-expect-error for some reason vscode is using the node types
      timeoutId = setTimeout(() => {
        cb?.();
        console.log('Timeout completed');
      }, 100);
    }

    let actionRunning = false;

    // const allMonitorsObservable = allMonitors.takeWhile(() => actionRunning);

    let allMonitorsSub: Subscription | undefined;

    const api = this.api;

    window.addEventListener('pointerdown', (event) => {
      if (actionRunning || !isClickableElement(event.target as HTMLElement)) {
        return;
      }

      actionRunning = true;
      const startTime = performance.now();
      let endTime: number | undefined;

      let hadFollowupActivity = false;

      startTimeout(() => {
        endTime = performance.now();
        console.log('Time taken 1:', endTime - startTime!);

        actionRunning = false;
      });

      allMonitorsSub = merge(httpMonitor, domMutationsMonitor, performanceEntriesMonitor)
        .takeWhile(() => actionRunning)
        .subscribe((_data) => {
          console.log('User action data:', _data);
          hadFollowupActivity = true;
          startTimeout(() => {
            endTime = performance.now();
            console.log('Time taken 2:', endTime - startTime!);

            actionRunning = false;

            if (hadFollowupActivity) {
              console.log('Action had followup activity');

              api.pushEvent('faro.user-action', {
                type: 'click',
                duration: (endTime! - startTime).toString(),
              });
            }
          });
        });
    });

    // Disable tracking for background tabs to free up resources
    document.addEventListener('visibilitychange', () => {
      console.log('Visibility changed:', document.visibilityState);
      if (document.visibilityState === 'hidden') {
        allMonitorsSub?.unsubscribe();
        allMonitorsSub = undefined;
      }
    });
  }
}
