import {
  apiMessageBus,
  dateNow,
  Faro,
  genShortID,
  merge,
  Observable,
  Subscription,
  USER_ACTION_CANCEL,
  USER_ACTION_END,
  USER_ACTION_HALT,
  USER_ACTION_START,
} from '@grafana/faro-core';

import {
  MESSAGE_TYPE_HTTP_REQUEST_END,
  MESSAGE_TYPE_HTTP_REQUEST_START,
  userActionDataAttributeParsed as userActionDataAttribute,
} from './const';
import { monitorDomMutations } from './domMutationMonitor';
import { monitorHttpRequests } from './httpRequestMonitor';
import { monitorPerformanceEntries } from './performanceEntriesMonitor';
import type { HttpRequestEndMessage, HttpRequestMessagePayload, HttpRequestStartMessage } from './types';
import { convertDataAttributeName } from './util';

const maxFollowUpActionTimeRange = 100;

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
      type: USER_ACTION_START,
      name: userActionName,
      startTime: startTime,
      parentId: actionId,
    });

    // Triggers if no initial action happened within the first 100ms
    timeoutId = startTimeout(
      timeoutId,
      () => {
        endTime = dateNow();

        // Listening for follow up activities stops once action is cancelled (set to false)
        actionRunning = false;
        sendUserActionCancelMessage(userActionName, actionId);
      },
      maxFollowUpActionTimeRange
    );

    allMonitorsObserver = merge(httpMonitor, domMutationsMonitor, performanceEntriesMonitor);

    const runningRequests = new Map<string, HttpRequestMessagePayload>();
    let isHalted = false;
    let pendingActionTimeoutId: number | undefined;

    allMonitorsSub = allMonitorsObserver
      .takeWhile(() => actionRunning)
      .subscribe((msg) => {
        if (isRequestStartMessage(msg)) {
          console.log('request start msg :>> ', msg);
          if (!isHalted) {
            runningRequests.set(msg.request.requestId, msg.request);
          }
        }
        if (isRequestEndMessage(msg)) {
          console.log('request end msg :>> ', msg);
          runningRequests.delete(msg.request.requestId);
        }

        // A http request, a DOM mutation or a performance entry happened so we have a follow up activity and start the timeout again
        // If timeout is triggered the user action is done and we send respective messages and events
        timeoutId = startTimeout(
          timeoutId,
          () => {
            endTime = dateNow();

            const sendEventProps = {
              api,
              userActionName,
              startTime,
              endTime: endTime!,
              actionId,
              event,
            };

            const hasPendingRequests = runningRequests.size > 0;
            const isAllPendingRequestsResolved = isHalted && !hasPendingRequests;

            if (isAllPendingRequestsResolved) {
              clearTimeout(pendingActionTimeoutId);
            }

            if (hasPendingRequests) {
              isHalted = true;

              apiMessageBus.notify({
                type: USER_ACTION_HALT,
                name: userActionName,
                parentId: actionId,
                reason: 'pending-requests',
              });

              pendingActionTimeoutId = startTimeout(
                undefined,
                () => {
                  allMonitorsSub?.unsubscribe();
                  allMonitorsObserver?.unsubscribeAll();
                  sendEvent(sendEventProps);
                  actionRunning = false;
                },
                1000 * 60
              );
            } else {
              allMonitorsSub?.unsubscribe();
              allMonitorsObserver?.unsubscribeAll();
              sendEvent(sendEventProps);
              actionRunning = false;
            }
          },
          maxFollowUpActionTimeRange
        );
      });
  }

  registerVisibilityChangeHandler(allMonitorsSub, allMonitorsObserver);

  return processUserEvent;
}

function sendEvent({
  api,
  userActionName,
  startTime,
  endTime,
  actionId,
  event,
}: {
  api: Faro['api'];
  userActionName: string;
  startTime: number;
  endTime: number;
  actionId: string;
  event: PointerEvent | KeyboardEvent;
}) {
  const duration = endTime - startTime;
  const eventType = event.type;

  // order matters, first emit the user-action-end event and afterwards push the parent event
  apiMessageBus.notify({
    type: USER_ACTION_END,
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

function startTimeout(timeoutId: number | undefined, cb: () => void, delay: number) {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  //@ts-expect-error for some reason vscode is using the node types
  timeoutId = setTimeout(() => {
    cb();
  }, delay);

  return timeoutId;
}

function sendUserActionCancelMessage(userActionName: string, actionId: string) {
  apiMessageBus.notify({
    type: USER_ACTION_CANCEL,
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

function isRequestStartMessage(msg: any): msg is HttpRequestStartMessage {
  return msg.type === MESSAGE_TYPE_HTTP_REQUEST_START;
}

function isRequestEndMessage(msg: any): msg is HttpRequestEndMessage {
  return msg.type === MESSAGE_TYPE_HTTP_REQUEST_END;
}
