import { noop } from '@grafana/faro-core';
import type { Faro, Subscription, UserActionInterface, UserActionInternalInterface } from '@grafana/faro-core';

import { defaultInitialActivityTimeout, userActionDataAttribute } from './const';
import { UserActionController } from './userActionController';
import {
  convertDataAttributeName,
  deriveUserActionTimeoutDataAttribute,
  normalizeDataAttributeName,
  normalizeInitialActivityTimeout,
  type TimeoutWarning,
} from './util';

export function getUserEventHandler(
  faro: Faro,
  onTimeoutWarning: TimeoutWarning = noop
): {
  processUserEvent: (event: PointerEvent | KeyboardEvent) => void;
  processUserActionStarted: (userAction: UserActionInterface, initialActivityTimeout?: number) => void;
} {
  const { api, config, internalLogger } = faro;
  const globalInitialActivityTimeout = normalizeInitialActivityTimeout(
    config.userActionsInstrumentation?.initialActivityTimeout,
    defaultInitialActivityTimeout,
    onTimeoutWarning
  );

  function processUserEvent(event: PointerEvent | KeyboardEvent): void {
    const dataAttributeName = config.userActionsInstrumentation?.dataAttributeName ?? userActionDataAttribute;

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const element = target.closest(`[${normalizeDataAttributeName(dataAttributeName)}]`) as HTMLElement | null;
    const userActionName = getUserActionNameFromElement(element, dataAttributeName);

    // We don't have a matching element or data attribute
    if (!element || !userActionName) {
      return;
    }

    const initialActivityTimeout = getUserActionTimeoutFromElement(element, dataAttributeName);
    api.startUserAction(userActionName, {}, { triggerName: event.type, initialActivityTimeout });
  }

  function processUserActionStarted(userAction: UserActionInterface, initialActivityTimeout?: number): void {
    const internalUserAction = userAction as unknown as UserActionInternalInterface;
    const effectiveInitialActivityTimeout = normalizeInitialActivityTimeout(
      initialActivityTimeout,
      globalInitialActivityTimeout,
      onTimeoutWarning
    );
    new UserActionController(internalUserAction, internalLogger.debug, effectiveInitialActivityTimeout).attach();
  }

  return { processUserEvent, processUserActionStarted };
}

export function getUserActionTimeoutFromElement(element: HTMLElement, dataAttributeName: string): number | undefined {
  const value = element.getAttribute(deriveUserActionTimeoutDataAttribute(dataAttributeName));
  return value === null ? undefined : Number(value);
}

export function getUserActionNameFromElement(
  element: HTMLElement | null,
  dataAttributeName: string
): string | undefined {
  if (!element) {
    return undefined;
  }

  const parsedDataAttributeName = convertDataAttributeName(dataAttributeName);
  const dataset = element.dataset;

  for (const key in dataset) {
    if (key === parsedDataAttributeName) {
      return dataset[key];
    }
  }

  return undefined;
}

export function unsubscribeAllMonitors(allMonitorsSub: Subscription | undefined): void {
  allMonitorsSub?.unsubscribe();
}
