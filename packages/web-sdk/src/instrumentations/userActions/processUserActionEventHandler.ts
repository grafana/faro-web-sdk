import { Observable, UserActionState } from '@grafana/faro-core';
import type { Faro, Subscription } from '@grafana/faro-core';

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

export function getUserEventHandler(faro: Faro) {
  const { api, config } = faro;

  const httpMonitor = monitorHttpRequests();
  const domMutationsMonitor = monitorDomMutations();
  const performanceEntriesMonitor = monitorPerformanceEntries();

  function processUserEvent(event: PointerEvent | KeyboardEvent) {
    let userActionName: string | undefined;
    let currentUserAction = api.getCurrentAction();

    if (!currentUserAction) {
      userActionName = getUserActionNameFromElement(
        event.target as HTMLElement,
        config.trackUserActionsDataAttributeName ?? userActionDataAttribute
      );
      currentUserAction = api.startUserAction(userActionName!, event.type);
    }

    const runningRequests = new Map<string, HttpRequestMessagePayload>();

    const allMonitorsSub = new Observable()
      .merge(httpMonitor, domMutationsMonitor, performanceEntriesMonitor)
      .takeWhile(() => [UserActionState.Started, UserActionState.Halted].includes(currentUserAction.getState()))
      .filter((msg) => {
        // If the user action is in halt state, we only keep listening to ended http requests
        if (
          currentUserAction.getState() === UserActionState.Halted &&
          !(isRequestEndMessage(msg) && runningRequests.has(msg.request.requestId))
        ) {
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
        currentUserAction.extend(() => runningRequests.size > 0);
      });

    currentUserAction
      .filter((v: UserActionState) => [UserActionState.Ended, UserActionState.Cancelled].includes(v))
      .first()
      .subscribe(() => {
        unsubscribeAllMonitors(allMonitorsSub);
      });
  }

  return processUserEvent;
}

export function getUserActionNameFromElement(element: HTMLElement, dataAttributeName: string): string | undefined {
  const parsedDataAttributeName = convertDataAttributeName(dataAttributeName);
  const dataset = element.dataset;

  for (const key in dataset) {
    if (key === parsedDataAttributeName) {
      return dataset[key];
    }
  }

  return undefined;
}

export function unsubscribeAllMonitors(allMonitorsSub: Subscription | undefined) {
  allMonitorsSub?.unsubscribe();
  allMonitorsSub = undefined;
}

export function isRequestStartMessage(msg: any): msg is HttpRequestStartMessage {
  return msg.type === MESSAGE_TYPE_HTTP_REQUEST_START;
}

export function isRequestEndMessage(msg: any): msg is HttpRequestEndMessage {
  return msg.type === MESSAGE_TYPE_HTTP_REQUEST_END;
}
