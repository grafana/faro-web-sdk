import type { EventEvent, EventsAPI } from './events';
import type { ExceptionEvent, ExceptionsAPI } from './exceptions';
import type { LogEvent, LogsAPI } from './logs';
import type { MeasurementEvent, MeasurementsAPI } from './measurements';
import type { MetaAPI } from './meta';
import type { TraceEvent, TracesAPI } from './traces';

export type APIEvent = LogEvent | ExceptionEvent | MeasurementEvent | TraceEvent | EventEvent;

export type API = LogsAPI & ExceptionsAPI & MeasurementsAPI & TracesAPI & MetaAPI & EventsAPI;
