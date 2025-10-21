import type { Faro, Subscription, UserActionInterface } from '@grafana/faro-core';

import {
  MESSAGE_TYPE_HTTP_REQUEST_END,
  MESSAGE_TYPE_HTTP_REQUEST_START,
  userActionDataAttributeParsed as userActionDataAttribute,
} from './const';
import type { HttpRequestEndMessage, HttpRequestStartMessage } from './types';
import { UserActionController } from './userActionController';
import { convertDataAttributeName } from './util';

export function getUserEventHandler(faro: Faro) {
  const { api, config } = faro;

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
      processUserActionStarted(userAction);
    }
  }

  function processUserActionStarted(userAction: UserActionInterface) {
    new UserActionController(userAction).attach();
  }

  return { processUserEvent, processUserActionStarted };
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
