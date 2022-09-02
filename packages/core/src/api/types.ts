import type { EventEvent, EventsAPI } from './events';
import type { ExceptionsAPI, ExceptionEvent } from './exceptions';
import type { LogsAPI, LogEvent } from './logs';
import type { MeasurementsAPI, MeasurementEvent } from './measurements';
import type { MetaAPI } from './meta';
import type { TracesAPI, TraceEvent } from './traces';

export type APIEvent = LogEvent | ExceptionEvent | MeasurementEvent | TraceEvent | EventEvent;

export type API = LogsAPI & ExceptionsAPI & MeasurementsAPI & TracesAPI & MetaAPI & EventsAPI;
