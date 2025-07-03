import type { Transports } from '../..';
import type { Config } from '../../config';

import { userActionStartByApiCallEventName } from './const';
import { type UserActionsAPI, UserActionState } from './types';
import { UserAction } from './userAction';

export function initializeUserActionsAPI({
  transports,
  config,
}: {
  transports: Transports;
  config: Config;
}): UserActionsAPI {
  const trackUserActionsExcludeItem = config.trackUserActionsExcludeItem;

  let currentUserAction: UserAction | undefined;

  const startUserAction: UserActionsAPI['startUserAction'] = (name: string, eventType?: string): UserAction => {
    if (!currentUserAction) {
      currentUserAction = new UserAction({
        name,
        transports,
        type: eventType || userActionStartByApiCallEventName,
        trackUserActionsExcludeItem,
      });
      currentUserAction
        .filter((v) => [UserActionState.Ended, UserActionState.Cancelled].includes(v))
        .first()
        .subscribe(() => {
          currentUserAction = undefined;
        });
      return currentUserAction;
    }
    return currentUserAction;
  };

  const getCurrentAction: UserActionsAPI['getCurrentAction'] = (): UserAction | undefined => {
    return currentUserAction;
  };

  return {
    startUserAction,
    getCurrentAction,
  };
}
