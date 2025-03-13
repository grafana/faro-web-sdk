import type { EventEvent, EventsAPI } from './events';
import type { ExceptionEvent, ExceptionsAPI } from './exceptions';
import type { LogEvent, LogsAPI } from './logs';
import type { MeasurementEvent, MeasurementsAPI } from './measurements';
import type { MetaAPI } from './meta';
import type { TraceEvent, TracesAPI } from './traces';

export type APIEvent = LogEvent | ExceptionEvent | MeasurementEvent | TraceEvent | EventEvent;

export type API = LogsAPI & ExceptionsAPI & MeasurementsAPI & TracesAPI & MetaAPI & EventsAPI;

export type ApiMessageBusMessage = {
  /**
   * Type of the message.
   */
  type: 'user-action-start' | 'user-action-end' | 'user-action-cancel';

  /**
   * Name of the user action.
   */
  name: string;

  /**
   * Id of the parent user action. Will be undefined for a parent action message.
   */
  parentId?: string;

  /**
   * Unique identifier for the user action. Will be undefined for messages related to child actions.
   */
  id?: string;
};

export type UserAction = {
  name: string;
  id?: string;
  parentId?: string;
};
