import { type TransportItem } from '../../transports';
import { Observable } from '../../utils/reactive';

import { userActionStartByApiCallEventName } from './const';

export enum UserActionState {
  Started,
  Halted,
  Cancelled,
  Ended,
}

export type HaltPredicate = () => boolean;

export interface UserActionInterface extends Observable {
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

export interface UserActionsAPI {
  startUserAction: (name: string, eventType: string) => UserActionInterface;
  getCurrentAction: () => UserActionInterface | undefined;
}
