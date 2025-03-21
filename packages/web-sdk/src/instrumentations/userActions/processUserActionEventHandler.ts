import { apiMessageBus, dateNow, Faro, genShortID, merge, Observable, Subscription } from '@grafana/faro-core';
import {
  USER_ACTION_CANCEL_MESSAGE_TYPE,
  USER_ACTION_END_MESSAGE_TYPE,
  USER_ACTION_START_MESSAGE_TYPE,
} from '@grafana/faro-core/src/api/const';

import { userActionDataAttributeParsed as userActionDataAttribute } from './const';
import { monitorDomMutations } from './domMutationMonitor';
import { monitorHttpRequests } from './httpRequestMonitor';
import { monitorPerformanceEntries } from './performanceEntriesMonitor';
import { convertDataAttributeName } from './util';

export function getUserEventHandler(faro: Faro) {
  const { api, config } = faro;

  const httpMonitor = monitorHttpRequests();
  const domMutationsMonitor = monitorDomMutations();
  const performanceEntriesMonitor = monitorPerformanceEntries();

  let allMonitorsSub: Subscription | undefined;
  let allMonitorsObserver: Observable | undefined;

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

    const actionId = genShortID();

    apiMessageBus.notify({
      type: USER_ACTION_START_MESSAGE_TYPE,
      name: userActionName,
      startTime: startTime,
      parentId: actionId,
    });

    // Triggers if no initial action happened within the first 100ms
    timeoutId = startTimeout(timeoutId, () => {
      endTime = dateNow();

      // Listening for follow up activities stops once action is cancelled (set to false)
      actionRunning = false;
      sendUserActionCancelMessage(userActionName, actionId);
    });

    allMonitorsObserver = merge(httpMonitor, domMutationsMonitor, performanceEntriesMonitor);

    allMonitorsSub = allMonitorsObserver
      .takeWhile(() => actionRunning)
      .subscribe(() => {
        // A http request, a DOM mutation or a performance entry happened so we have a follow up activity and start the timeout again
        // If timeout is triggered the user action is done and we send respective messages and events
        timeoutId = startTimeout(timeoutId, () => {
          endTime = dateNow();

          const duration = endTime - startTime;
          const eventType = event.type;

          // order matters, first emit the user-action-end event and then push the event
          apiMessageBus.notify({
            type: USER_ACTION_END_MESSAGE_TYPE,
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
              customPayloadTransformer: (payload) => {
                payload.action = {
                  id: actionId,
                  name: userActionName,
                };

                return payload;
              },
            }
          );

          // Ensure action is blocked until it is fully processed.
          actionRunning = false;
          allMonitorsSub?.unsubscribe();
          allMonitorsObserver?.unsubscribeAll();
        });
      });
  }

  registerVisibilityChangeHandler(allMonitorsSub, allMonitorsObserver);

  return processUserEvent;
}

function getUserActionName(element: HTMLElement, dataAttributeName: string): string | undefined {
  const parsedDataAttributeName = convertDataAttributeName(dataAttributeName);
  const dataset = element.dataset;

  for (const key in dataset) {
    if (key === parsedDataAttributeName) {
      return dataset[key];
    }
  }

  return undefined;
}

function startTimeout(timeoutId: number | undefined, cb: () => void) {
  const maxTimeSpanTillUserActionEnd = 100;

  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  //@ts-expect-error for some reason vscode is using the node types
  timeoutId = setTimeout(() => {
    cb();
  }, maxTimeSpanTillUserActionEnd);

  return timeoutId;
}

function sendUserActionCancelMessage(userActionName: string, actionId: string) {
  apiMessageBus.notify({
    type: USER_ACTION_CANCEL_MESSAGE_TYPE,
    name: userActionName,
    parentId: actionId,
  });
}

function registerVisibilityChangeHandler(
  allMonitorsSub: Subscription | undefined,
  allMonitorsObserver: Observable | undefined
) {
  // stop monitoring in background tabs
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // Unsubscribe from all monitors when the tab goes into the background to free up resources (merge.unsubscribe() also unsubscribes from all inner observables)
      // Monitors will be re-subscribed in the processEvent function when the first user action is detected
      allMonitorsSub?.unsubscribe();
      allMonitorsSub = undefined;

      allMonitorsObserver?.unsubscribeAll();
      allMonitorsObserver = undefined;
    }
  });
}
