export { defaultExceptionType, defaultErrorArgsSerializer } from './const';

export { initializeExceptionsAPI } from './initialize';

export type {
  ExceptionEvent,
  ExceptionStackFrame,
  ExceptionsAPI,
  ExtendedError,
  PushErrorOptions,
  Stacktrace,
  StacktraceParser,
  ErrorWithIndexProperties,
  ExceptionEventExtended,
} from './types';
