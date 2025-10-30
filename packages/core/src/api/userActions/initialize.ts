import { type InternalLogger, type Transports } from '../..';
import type { Config } from '../../config';
import { Observable } from '../../utils/reactive';

import { UserActionSeverity, userActionStart, userActionStartByApiCallEventName } from './const';
import {
  type StartUserActionOptions,
  type UserActionInterface,
  type UserActionMessage,
  type UserActionsAPI,
  UserActionState,
} from './types';
import UserAction from './userAction';

export const userActionsMessageBus = new Observable<UserActionMessage>();

// Internal-only access to the concrete UserAction instance for a given API
const userActionsInternals = new WeakMap<UserActionsAPI, () => UserAction | undefined>();
export function getActiveUserActionInternal(api: UserActionsAPI): UserAction | undefined {
  return userActionsInternals.get(api)?.();
}

export function initializeUserActionsAPI({
  transports,
  internalLogger,
  config,
}: {
  transports: Transports;
  config: Config;
  internalLogger: InternalLogger;
}): UserActionsAPI {
  const trackUserActionsExcludeItem = config.trackUserActionsExcludeItem;

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
        severity: options?.severity || UserActionSeverity.Normal,
        trackUserActionsExcludeItem,
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

  userActionsInternals.set(api, () => activeUserAction);

  return api;
}
