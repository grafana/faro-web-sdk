import type { ExceptionEvent, LogEvent, TraceEvent } from '../logger';
import type { MetaValues } from '../meta';

export interface ApiHandlerPayload {
  logs: LogEvent[];
  exceptions: ExceptionEvent[];
  traces: TraceEvent[];
  meta?: MetaValues;
}

export type ApiHandler = (payload: ApiHandlerPayload) => void;
