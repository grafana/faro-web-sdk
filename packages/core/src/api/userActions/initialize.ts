import type { Config } from '../../config';
import type { InternalLogger } from '../../internalLogger';
import type { TransportItem, Transports } from '../../transports';
import { Observable } from '../../utils/reactive';
import type { EventsAPI } from '../events/types';

import { UserActionImportance, userActionStart, userActionStartByApiCallEventName } from './const';
import {
  type StartUserActionOptions,
  type UserActionInterface,
  type UserActionInternalInterface,
  type UserActionMessage,
  type UserActionsAPI,
  UserActionState,
  type UserActionTransportItemBuffer,
} from './types';
import UserAction from './userAction';

export const userActionsMessageBus = new Observable<UserActionMessage>();

export function initializeUserActionsAPI({
  transports,
  internalLogger,
  config,
  pushEvent,
}: {
  transports: Transports;
  config: Config;
  internalLogger: InternalLogger;
  pushEvent: EventsAPI['pushEvent'];
}): UserActionsAPI {
  const trackUserActionsExcludeItem = config.userActionsInstrumentation?.excludeItem;

  // Currently running user action. It can be in either started or halted
  // state
  let activeUserAction: UserAction | undefined;

  // If there is a an action already running, return undefined to indicate
  // we were not able to create one.
  const startUserAction: UserActionsAPI['startUserAction'] = (
    name: string,
    attributes?: Record<string, string>,
    options?: StartUserActionOptions
  ): UserActionInterface | undefined => {
    const currentRunningUserAction = getActiveUserAction();

    if (currentRunningUserAction === undefined) {
      const userAction = new UserAction({
        name,
        transports,
        attributes,
        trigger: options?.triggerName || userActionStartByApiCallEventName,
        importance: options?.importance || UserActionImportance.Normal,
        trackUserActionsExcludeItem,
        pushEvent,
      });
      userAction
        .filter((v) => [UserActionState.Ended, UserActionState.Cancelled].includes(v))
        .first()
        .subscribe(() => {
          activeUserAction = undefined;
        });

      userActionsMessageBus.notify({
        type: userActionStart,
        userAction: userAction,
      });
      activeUserAction = userAction;

      return activeUserAction;
    } else {
      internalLogger.error('Attempted to create a new user action while one is already running. This is not possible.');
      return undefined;
    }
  };

  const getActiveUserAction: UserActionsAPI['getActiveUserAction'] = (): UserActionInterface | undefined => {
    return activeUserAction;
  };

  const api: UserActionsAPI = {
    startUserAction,
    getActiveUserAction,
  };

  return api;
}

/**
 * Adds an item to the buffer associated with the given UserAction.
 * The item will only be added if the UserAction is in the Started state.
 * @param userAction The UserAction instance
 * @param item The item to add to the buffer
 * @returns {boolean} True if the item was added, false otherwise
 */
export function addItemToUserActionBuffer(userAction: UserActionInterface | undefined, item: TransportItem): boolean {
  if (!userAction) {
    return false;
  }
  const state = (userAction as unknown as UserActionInternalInterface)?.getState();
  if (state !== UserActionState.Started) {
    return false;
  }
  (userAction as unknown as UserActionTransportItemBuffer).addItem(item);
  return true;
}
