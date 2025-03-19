import { apiMessageBus, dateNow, Faro, genShortID, merge, Subscription } from '@grafana/faro-core';

import { userActionDataAttributeParsed as userActionDataAttribute } from './const';
import { monitorDomMutations } from './domMutationMonitor';
import { monitorHttpRequests } from './httpRequestMonitor';
import { monitorPerformanceEntries } from './performanceEntriesMonitor';

export function getUserEventHandler(faro: Faro) {
  const { api, config } = faro;

  const httpMonitor = monitorHttpRequests();
  const domMutationsMonitor = monitorDomMutations();
  const performanceEntriesMonitor = monitorPerformanceEntries();

  let allMonitorsSub: Subscription | undefined;

  let timeoutId: number | undefined;
  let actionRunning = false;

  function processUserEvent(event: PointerEvent | KeyboardEvent) {
    const userActionName = getUserActionName(
      event.target as HTMLElement,
      config.trackUserActionsDataAttributeName ?? userActionDataAttribute
    );

    if (actionRunning || userActionName == null) {
      return;
    }

    actionRunning = true;

    const startTime = dateNow();
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
      endTime = dateNow();
      actionRunning = false;
    });

    allMonitorsSub = merge(httpMonitor, domMutationsMonitor, performanceEntriesMonitor)
      .takeWhile(() => actionRunning)
      .subscribe((_data) => {
        hadFollowupActivity = true;

        timeoutId = startTimeout(timeoutId, () => {
          endTime = dateNow();

          if (hadFollowupActivity) {
            // action is valid. Leads to adding the parentId to items, flushing the buffer and sending the items to the server

            const duration = endTime - startTime;
            const eventType = event.type;

            // order matters, first notify the user-action-end event and then push the event
            apiMessageBus.notify({
              type: 'user-action-end',
              name: userActionName,
              id: actionId,
              startTime,
              endTime,
              duration,
              eventType,
            });

            // Send the final action parent event
            api.pushEvent(
              userActionName,
              {
                userActionStartTime: startTime.toString(),
                userActionEndTime: endTime.toString(),
                userActionDuration: duration.toString(),
                userActionEventType: eventType,
              },
              undefined,
              {
                timestampOverwriteMs: startTime,
                customPayloadParser: (payload) => {
                  payload.action = {
                    id: actionId,
                    name: userActionName,
                  };

                  return payload;
                },
              }
            );
          } else {
            // action is invalid. Flushing the buffer and sending the items to the server without adding the parentId to items
            apiMessageBus.notify({
              type: 'user-action-cancel',
              name: userActionName,
              parentId: actionId,
            });
          }

          // Ensure action is blocked until it is fully processed.
          actionRunning = false;
        });
      });
  }

  registerVisibilityChangeHandler(allMonitorsSub);

  return processUserEvent;
}

function getUserActionName(element: HTMLElement, dataAttributeName: string): string | undefined {
  const dataset = element.dataset;

  for (const key in dataset) {
    if (key === dataAttributeName) {
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

function registerVisibilityChangeHandler(allMonitorsSub: Subscription | undefined) {
  // stop monitoring in background tabs
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // Unsubscribe from all monitors when the tab goes into the background to free up resources (merge.unsubscribe() also unsubscribes from all inner observables)
      // Monitors will be re-subscribed in the processEvent function when the first user action is detected
      allMonitorsSub?.unsubscribe();
      allMonitorsSub = undefined;
    }
  });
}
