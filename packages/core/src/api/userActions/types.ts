import { type TransportItem } from '../../transports';

import { type UserActionImportanceType, userActionStartByApiCallEventName } from './const';

export enum UserActionState {
  Started,
  Halted,
  Cancelled,
  Ended,
}

/**
 * Public interface for the UserAction.
 * This is the interface that is part of the public API.
 */
export interface UserActionInterface {
  name: string;
  parentId: string;
}

/**
 * Internal interface for the UserAction.
 * This interface is intended for internal use only and not guaranteed to be stable.
 */
export interface UserActionInternalInterface extends UserActionInterface {
  halt(): void;
  end(attributes?: Record<string, string>): void;
  cancel(): void;
  getState(): UserActionState;
}

export interface UserActionTransportItemBuffer {
  addItem(item: TransportItem): boolean;
}

export type ApiUserActionEvent = {
  name: string;
  attributes?: Record<string, string>;
  type: typeof userActionStartByApiCallEventName | string;
};

export type EndUserActionProps = {
  userActionName: string;
  startTime: number;
  endTime: number;
  actionId: string;
  event: ApiUserActionEvent;
  attributes?: Record<string, string>;
};

export type StartUserActionOptions = {
  triggerName?: string;
  importance?: UserActionImportanceType;
};

export interface UserActionsAPI {
  startUserAction: (
    name: string,
    attributes?: Record<string, string>,
    options?: StartUserActionOptions
  ) => UserActionInterface | undefined;
  getActiveUserAction: () => UserActionInterface | undefined;
}

export type UserActionStart = {
  type: 'user_action_start';
  userAction: UserActionInterface;
};

// Union type
export type UserActionMessage = UserActionStart;
