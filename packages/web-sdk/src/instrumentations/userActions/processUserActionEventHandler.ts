import { Observable, UserActionState } from '@grafana/faro-core';
import type { Faro, Subscription, UserActionInterface } from '@grafana/faro-core';

import {
  MESSAGE_TYPE_HTTP_REQUEST_END,
  MESSAGE_TYPE_HTTP_REQUEST_START,
} from './const';
import { userActionDataAttribute } from './const';
import { monitorDomMutations } from './index';
import { monitorHttpRequests } from './index';
import { monitorPerformanceEntries } from './index';
import type { HttpRequestEndMessage, HttpRequestMessagePayload, HttpRequestStartMessage } from './index';
import { convertDataAttributeName } from './util';

export function getUserEventHandler(faro: Faro) {
  const { api, config } = faro;

  const httpMonitor = monitorHttpRequests();
  const domMutationsMonitor = monitorDomMutations();
  const performanceEntriesMonitor = monitorPerformanceEntries();

  function processUserEvent(event: PointerEvent | KeyboardEvent) {
    const userActionName = getUserActionNameFromElement(
      event.target as HTMLElement,
      config.trackUserActionsDataAttributeName ?? userActionDataAttribute
    );

    // We don't have a data attribute
    if (!userActionName) {
      return;
    }

    const userAction = api.startUserAction(userActionName, {}, { triggerName: event.type });
    if (userAction) {
      proceessUserActionStarted(userAction);
    }
  }

  function proceessUserActionStarted(userAction: UserActionInterface) {
    const runningRequests = new Map<string, HttpRequestMessagePayload>();
    const allMonitorsSub = new Observable()
      .merge(httpMonitor, domMutationsMonitor, performanceEntriesMonitor)
      .takeWhile(() => [UserActionState.Started, UserActionState.Halted].includes(userAction.getState()))
      .filter((msg) => {
        // If the user action is in halt state, we only keep listening to ended http requests
        if (
          userAction.getState() === UserActionState.Halted &&
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

        if (!isRequestEndMessage(msg)) {
          userAction.extend(() => runningRequests.size > 0);
        } else if (userAction.getState() === UserActionState.Halted && runningRequests.size === 0) {
          userAction.end();
        }
      });

    (userAction as unknown as Observable)
      .filter((v: UserActionState) => [UserActionState.Ended, UserActionState.Cancelled].includes(v))
      .first()
      .subscribe(() => {
        unsubscribeAllMonitors(allMonitorsSub);
      });
  }

  return { processUserEvent, proceessUserActionStarted };
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
