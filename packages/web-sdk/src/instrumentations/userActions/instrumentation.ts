import { apiMessageBus, BaseInstrumentation, genShortID, merge, Subscription, VERSION } from '@grafana/faro-core';

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

      const actionId = genShortID();

      apiMessageBus.notify({
        type: 'user-action-start',
        name: userActionName,
        startTime: startTime,
        parentId: actionId,
      });

      timeoutId = startTimeout(timeoutId, () => {
        endTime = performance.now();
        actionRunning = false;
      });

      allMonitorsSub = merge(httpMonitor, domMutationsMonitor, performanceEntriesMonitor)
        .takeWhile(() => actionRunning)
        .subscribe((_data) => {
          hadFollowupActivity = true;

          timeoutId = startTimeout(timeoutId, () => {
            endTime = performance.now();

            if (hadFollowupActivity) {
              // action is valid. Leads to adding the parentId to items, flushing the buffer and sending the items to the server
              apiMessageBus.notify({
                type: 'user-action-end',
                name: userActionName,
                id: actionId,
                startTime: startTime,
                endTime: endTime,
                duration: endTime! - startTime,
              });
            } else {
              // action is invalid. Flushing the buffer and sending the items to the server without adding the parentId to items
              apiMessageBus.notify({
                type: 'user-action-cancel',
                name: userActionName,
                parentId: actionId,
              });
            }

            actionRunning = false;
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
  const maxTimeSpanTillUserActionEnd = 100;

  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  //@ts-expect-error for some reason vscode is using the node types
  timeoutId = setTimeout(() => {
    cb?.();
  }, maxTimeSpanTillUserActionEnd);

  return timeoutId;
}
