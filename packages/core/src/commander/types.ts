import type { ExceptionEvent, ExceptionsCommands } from './exceptions';
import type { LogEvent, LogsCommands } from './logs';
import type { MeasurementEvent, MeasurementsCommands } from './measurements';
import type { TraceEvent, TracesCommands } from './traces';

export type CommanderEvent = LogEvent | ExceptionEvent | MeasurementEvent | TraceEvent;

export type Commander = LogsCommands & ExceptionsCommands & MeasurementsCommands & TracesCommands;
