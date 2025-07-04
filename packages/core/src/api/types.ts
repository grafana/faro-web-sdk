import type { EventEvent, EventsAPI } from './events';
import type { ExceptionEvent, ExceptionsAPI } from './exceptions';
import type { LogEvent, LogsAPI } from './logs';
import type { MeasurementEvent, MeasurementsAPI } from './measurements';
import type { MetaAPI } from './meta';
import type { TraceEvent, TracesAPI } from './traces';
import type { UserActionsAPI } from './userActions';

export type UserAction = {
  name: string;
  id?: string;
  parentId?: string;
};

export type APIEvent = LogEvent | ExceptionEvent | MeasurementEvent | TraceEvent | EventEvent;

export type API = LogsAPI & ExceptionsAPI & MeasurementsAPI & TracesAPI & MetaAPI & EventsAPI & UserActionsAPI;
