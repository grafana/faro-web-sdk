import { type TransportItem } from '../../transports';

import { UserActionSeverity, userActionStartByApiCallEventName } from './const';

export enum UserActionState {
  Started,
  Halted,
  Cancelled,
  Ended,
}

export type HaltPredicate = () => boolean;

export interface UserActionInterface {
  name: string;
  parentId: string;

  addItem(item: TransportItem): void;
  extend(haltPredicate?: HaltPredicate): void;
  end(attributes?: Record<string, string>): void;
  halt(reason?: string): void;
  cancel(): void;
  getState(): UserActionState;
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
  severity?: UserActionSeverity;
  cancelTimeout?: number;
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
