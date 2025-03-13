import { BaseInstrumentation, merge, Subscription, VERSION } from '@grafana/faro-core';

import { USER_ACTION_DATA_ATTRIBUTE_PREFIX } from './const';
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

    let timeoutId: number | undefined;
    let actionRunning = false;
    let allMonitorsSub: Subscription | undefined;

    const self = this;

    window.addEventListener('pointerdown', processEvent);
    window.addEventListener('keydown', processEvent);

    function processEvent(event: PointerEvent | KeyboardEvent) {
      const userActionName = getUserActionName(event.target as HTMLElement);

      if (actionRunning || userActionName == null) {
        return;
      }

      actionRunning = true;

      const startTime = performance.now();
      let endTime: number | undefined;
      let hadFollowupActivity = false;

      timeoutId = startTimeout(timeoutId, () => {
        endTime = performance.now();
        console.log('Time taken 1:', endTime - startTime!);
        actionRunning = false;
      });

      allMonitorsSub = merge(httpMonitor, domMutationsMonitor, performanceEntriesMonitor)
        .takeWhile(() => actionRunning)
        .subscribe((_data) => {
          console.log('User action data:', _data);
          hadFollowupActivity = true;

          timeoutId = startTimeout(timeoutId, () => {
            endTime = performance.now();
            console.log('Time taken 2:', endTime - startTime!);

            actionRunning = false;

            if (hadFollowupActivity) {
              console.log('Action had followup activity');

              self.api.pushEvent('faro.user-action', {
                name: userActionName,
                type: event.type,
                duration: (endTime! - startTime).toString(),
              });
            }
          });
        });
    }

    registerVisibilityChangeHandler(allMonitorsSub);
  }
}

function registerVisibilityChangeHandler(allMonitorsSub: Subscription | undefined) {
  // stop monitoring background tabs
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // Unsubscribe from all monitors when the tab goes into the background to free up resources (merge.unsubscribe() also unsubscribes from all inner observables)
      allMonitorsSub?.unsubscribe();
      allMonitorsSub = undefined;
    }
  });
}

function getUserActionName(element: HTMLElement): string | undefined {
  const dataset = element.dataset;
  for (const key in dataset) {
    if (key.startsWith(USER_ACTION_DATA_ATTRIBUTE_PREFIX)) {
      return dataset[key];
    }
  }

  return undefined;
}

function startTimeout(timeoutId: number | undefined, cb?: () => void) {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  //@ts-expect-error for some reason vscode is using the node types
  timeoutId = setTimeout(() => {
    cb?.();
    console.log('Timeout completed');
  }, 100);

  return timeoutId;
}
