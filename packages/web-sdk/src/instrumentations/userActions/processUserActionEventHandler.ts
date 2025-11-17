import type { Faro, Subscription, UserActionInterface, UserActionInternalInterface } from '@grafana/faro-core';

import { userActionDataAttributeParsed as userActionDataAttribute } from './const';
import { UserActionController } from './userActionController';
import { convertDataAttributeName } from './util';

export function getUserEventHandler(faro: Faro) {
  const { api, config } = faro;

  function processUserEvent(event: PointerEvent | KeyboardEvent) {
    const userActionName = getUserActionNameFromElement(
      event.target as HTMLElement,
      config.userActionsInstrumentation?.dataAttributeName ?? userActionDataAttribute
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
    const internalUserAction = userAction as unknown as UserActionInternalInterface;
    new UserActionController(internalUserAction).attach();
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
