import type { EventEvent, EventsAPI } from './events';
import type { ExceptionEvent, ExceptionsAPI } from './exceptions';
import type { LogEvent, LogsAPI } from './logs';
import type { MeasurementEvent, MeasurementsAPI } from './measurements';
import type { MetaAPI } from './meta';
import type { TraceEvent, TracesAPI } from './traces';

export type APIEvent = LogEvent | ExceptionEvent | MeasurementEvent | TraceEvent | EventEvent;

export type API = LogsAPI & ExceptionsAPI & MeasurementsAPI & TracesAPI & MetaAPI & EventsAPI;

export type ApiMessageBusMessages = UserActionStartMessage | UserActionEndMessage | UserActionCancelMessage;

export type UserActionStartMessage = {
  type: 'user-action-start';
  name: string;
  startTime: number;

  /**
   * Unique identifier of the parent user action to which this action belongs.
   */
  parentId: string;
};

export type UserActionEndMessage = {
  type: 'user-action-end';
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
  type: 'user-action-cancel';
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
