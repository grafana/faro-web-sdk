import type { SpanContext } from '@opentelemetry/api';

import type { TraceContext } from '../traces';
import type { UserAction } from '../types';

export type StacktraceParser = (err: ExtendedError) => Stacktrace;

export interface ExceptionStackFrame {
  filename: string;
  function: string;

  colno?: number;
  lineno?: number;

  bundleid?: string;
}

export interface ExtendedError extends Error {
  columnNumber?: number;
  stacktrace?: Error['stack'];
}

export interface Stacktrace {
  frames: ExceptionStackFrame[];
}

export type ExceptionContext = Record<string, string>;

export interface ExceptionEventDefault {
  timestamp: string;
  type: string;
  value: string;

  stacktrace?: Stacktrace;
  trace?: TraceContext;
  context?: ExceptionContext;

  action?: UserAction;
}

/**
 * The ExceptionEventExtended type is used to represent an exception event with an additional error
 * property and is only meant for client side use. The additional property is removed by Faro before
 * sending the event to the transport.
 */
export type ExceptionEventExtended = ExceptionEventDefault & {
  originalError?: Error;
};

export type ExceptionEvent<EXTENDED = ExceptionEventDefault> = EXTENDED extends boolean
  ? ExceptionEventExtended
  : ExceptionEventDefault;

export interface PushErrorOptions {
  skipDedupe?: boolean;
  stackFrames?: ExceptionStackFrame[];
  type?: string;
  context?: ExceptionContext;
  spanContext?: Pick<SpanContext, 'traceId' | 'spanId'>;
  timestampOverwriteMs?: number;
  /**
   * Retains the original error object in the payload after parsing.
   * This is primarily for internal, advanced use cases.
   * Faro users should not need to use this option.
   */
  originalError?: Error;
}

// ts type is missing the cause property
export type ErrorWithIndexProperties = Error & {
  cause?: any;
};

export interface ExceptionsAPI {
  changeStacktraceParser: (stacktraceParser: StacktraceParser) => void;
  getStacktraceParser: () => StacktraceParser | undefined;
  pushError: (value: ErrorWithIndexProperties, options?: PushErrorOptions) => void;
}
