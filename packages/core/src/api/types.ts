import type { ExceptionsAPI, ExceptionEvent } from './exceptions';
import type { LogsAPI, LogEvent } from './logs';
import type { MeasurementsAPI, MeasurementEvent } from './measurements';
import type { TracesAPI, TraceEvent } from './traces';

export type APIEvent = LogEvent | ExceptionEvent | MeasurementEvent | TraceEvent;

export type API = LogsAPI & ExceptionsAPI & MeasurementsAPI & TracesAPI;
