import {
  apiMessageBus,
  dateNow,
  genShortID,
  Observable,
  stringifyObjectValues,
  USER_ACTION_CANCEL,
  USER_ACTION_END,
  USER_ACTION_HALT,
  USER_ACTION_START,
} from '@grafana/faro-core';
import type { Faro, Subscription } from '@grafana/faro-core';

import {
  MESSAGE_TYPE_HTTP_REQUEST_END,
  MESSAGE_TYPE_HTTP_REQUEST_START,
  userActionDataAttributeParsed as userActionDataAttribute,
} from './const';
import { monitorDomMutations } from './domMutationMonitor';
import { monitorHttpRequests } from './httpRequestMonitor';
import { monitorPerformanceEntries } from './performanceEntriesMonitor';
import type { ApiEvent, HttpRequestEndMessage, HttpRequestMessagePayload, HttpRequestStartMessage } from './types';
import { convertDataAttributeName } from './util';

const maxFollowUpActionTimeRange = 100;

export function getUserEventHandler(faro: Faro) {
  const { api, config } = faro;

  const httpMonitor = monitorHttpRequests();
  const domMutationsMonitor = monitorDomMutations();
  const performanceEntriesMonitor = monitorPerformanceEntries();

  let timeoutId: number | undefined;
  let actionRunning = false;

  function processUserEvent(event: PointerEvent | KeyboardEvent | ApiEvent) {
    let userActionName: string | undefined;

    const isApiEventDetected = isApiEvent(event);
    if (isApiEventDetected) {
      userActionName = event.name;
    } else {
      userActionName = getUserActionName(
        event.target as HTMLElement,
        config.trackUserActionsDataAttributeName ?? userActionDataAttribute
      );
    }

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

    const runningRequests = new Map<string, HttpRequestMessagePayload>();
    let isHalted = false;
    let pendingActionTimeoutId: number | undefined;

    const allMonitorsSub = new Observable()
      .merge(httpMonitor, domMutationsMonitor, performanceEntriesMonitor)
      .takeWhile(() => actionRunning)
      .filter((msg) => {
        // If the user action is in halt state, we only keep listening to ended http requests
        if (isHalted && !(isRequestEndMessage(msg) && runningRequests.has(msg.request.requestId))) {
          return false;
        }

        return true;
      })
      .subscribe((msg) => {
        if (isRequestStartMessage(msg)) {
          // An action is on halt if it has pending items, like pending HTTP requests.
          // In this case we start a separate timeout to wait for the requests to finish
          // If in the halt state, we stop adding Faro signals to the action's buffer (see userActionLifecycleHandler.ts)
          // But we are still subscribed to
          runningRequests.set(msg.request.requestId, msg.request);
        }
        if (isRequestEndMessage(msg)) {
          runningRequests.delete(msg.request.requestId);
        }

        // A http request, a DOM mutation or a performance entry happened so we have a follow up activity and start the timeout again
        // If timeout is triggered the user action is done and we send respective messages and events
        timeoutId = startTimeout(
          timeoutId,
          () => {
            endTime = dateNow();

            const userActionParentEventProps = {
              api,
              userActionName,
              startTime,
              endTime: endTime!,
              actionId,
              event,
              ...(isApiEventDetected ? { attributes: event.attributes } : {}),
            };

            const hasPendingRequests = runningRequests.size > 0;
            const isAllPendingRequestsResolved = isHalted && !hasPendingRequests;

            if (isAllPendingRequestsResolved) {
              clearTimeout(pendingActionTimeoutId);
              isHalted = false;
            }

            if (hasPendingRequests) {
              isHalted = true;

              apiMessageBus.notify({
                type: USER_ACTION_HALT,
                name: userActionName,
                parentId: actionId,
                reason: 'pending-requests',
                haltTime: dateNow(),
              });

              pendingActionTimeoutId = startTimeout(
                undefined,
                () => {
                  unsubscribeAllMonitors(allMonitorsSub);
                  endUserAction(userActionParentEventProps);
                  actionRunning = false;
                  isHalted = false;
                },
                1000 * 10
              );
            } else {
              unsubscribeAllMonitors(allMonitorsSub);
              endUserAction(userActionParentEventProps);
              actionRunning = false;
              isHalted = false;
            }
          },
          maxFollowUpActionTimeRange
        );
      });
  }

  return processUserEvent;
}

/**
 * User action was successfully completed and we send the final event(s)
 */
function endUserAction(props: {
  api: Faro['api'];
  userActionName: string;
  startTime: number;
  endTime: number;
  actionId: string;
  event: PointerEvent | KeyboardEvent | ApiEvent;
  attributes?: Record<string, string>;
}) {
  const { api, userActionName, startTime, endTime, actionId, event, attributes } = props;
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
      ...stringifyObjectValues(attributes),
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

function unsubscribeAllMonitors(allMonitorsSub: Subscription | undefined) {
  allMonitorsSub?.unsubscribe();
  allMonitorsSub = undefined;
}

function isRequestStartMessage(msg: any): msg is HttpRequestStartMessage {
  return msg.type === MESSAGE_TYPE_HTTP_REQUEST_START;
}

function isRequestEndMessage(msg: any): msg is HttpRequestEndMessage {
  return msg.type === MESSAGE_TYPE_HTTP_REQUEST_END;
}

function isApiEvent(apiEvent: any): apiEvent is { name: string; attributes?: Record<string, string> } {
  return apiEvent.type === 'apiEvent' && typeof apiEvent.name === 'string';
}
