import { USER_ACTION_CANCEL_MESSAGE_TYPE, USER_ACTION_END_MESSAGE_TYPE, USER_ACTION_START_MESSAGE_TYPE } from './const';
import type { EventEvent, EventsAPI } from './events';
import type { ExceptionEvent, ExceptionsAPI } from './exceptions';
import type { LogEvent, LogsAPI } from './logs';
import type { MeasurementEvent, MeasurementsAPI } from './measurements';
import type { MetaAPI } from './meta';
import type { TraceEvent, TracesAPI } from './traces';

export type APIEvent = LogEvent | ExceptionEvent | MeasurementEvent | TraceEvent | EventEvent;

export type API = LogsAPI & ExceptionsAPI & MeasurementsAPI & TracesAPI & MetaAPI & EventsAPI;

export type ApiMessageBusMessages = UserActionStartMessage | UserActionEndMessage | UserActionCancelMessage;

export type UserActionMessageType =
  | typeof USER_ACTION_START_MESSAGE_TYPE
  | typeof USER_ACTION_END_MESSAGE_TYPE
  | typeof USER_ACTION_CANCEL_MESSAGE_TYPE;

export type UserActionStartMessage = {
  type: typeof USER_ACTION_START_MESSAGE_TYPE;
  name: string;
  startTime: number;

  /**
   * Unique identifier of the parent user action to which this action belongs.
   */
  parentId: string;
};

export type UserActionEndMessage = {
  type: typeof USER_ACTION_END_MESSAGE_TYPE;
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  eventType: string;

  /**
   * Unique identifier for the user action. Will be undefined for messages related to child actions.
   */
  id: string;
};

export type UserActionCancelMessage = {
  type: typeof USER_ACTION_CANCEL_MESSAGE_TYPE;
  name: string;

  /**
   * Unique identifier of the parent user action to which this action belongs.
   */
  parentId?: string;
};

export type UserAction = {
  name: string;
  id?: string;
  parentId?: string;
};
