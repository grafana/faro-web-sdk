export { agent } from './agent';
export type { Agent } from './agent';

export { allLogLevels, defaultExceptionType, defaultLogLevel, LogLevel } from './api';
export type {
  API,
  APIEvent,
  ExceptionEvent,
  ExceptionStackFrame,
  InstrumentationLibrarySpan,
  LogContext,
  LogEvent,
  MeasurementEvent,
  ResourceSpan,
  Stacktrace,
  TraceEvent,
} from './api';

// TODO: Remove this alias after the updating the projects where we dogfood
export { initializeGrafanaAgent, initializeGrafanaAgent as initializeAgent } from './initialize';

export type { Config, Patterns, StacktraceParser } from './config';
export { defaultGlobalObjectKey } from './config';

export type { InternalLogger } from './internalLogger';

export type { Instrumentation } from './instrumentations';
export { BaseInstrumentation } from './instrumentations';

export type { App, Meta, MetaGetter, MetaItem, Metas, Session, User } from './metas';

export type { OriginalConsole } from './originalConsole';

export { BaseTransport, getTransportBody, TransportItemType } from './transports';
export type { Transport, TransportBody, TransportItem, TransportItemPayload, Transports } from './transports';

export * from './utils';
export { VERSION } from './version';
