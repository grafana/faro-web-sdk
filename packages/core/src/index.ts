export {
  faro,
  getInternalFaroFromGlobalObject,
  internalGlobalObjectKey,
  isInternalFaroOnGlobalObject,
  setInternalFaroOnGlobalObject,
} from './sdk';
export type { Faro } from './sdk';

export { defaultExceptionType } from './api';
export type {
  API,
  APIEvent,
  ExceptionEvent,
  ExceptionStackFrame,
  ExceptionsAPI,
  ExtendedError,
  InstrumentationLibrarySpan,
  LogContext,
  LogEvent,
  LogsAPI,
  MeasurementEvent,
  MeasurementsAPI,
  MetaAPI,
  OTELApi,
  PushErrorOptions,
  PushLogOptions,
  PushMeasurementOptions,
  ResourceSpan,
  Stacktrace,
  StacktraceParser,
  TraceContext,
  TraceEvent,
  TracesAPI,
  EventEvent,
  EventsAPI,
} from './api';

export { globalObject } from './globalObject';
export type { GlobalObject } from './globalObject';

export { initializeFaro } from './initialize';

export { defaultGlobalObjectKey } from './config';
export type { Config, Patterns } from './config';

export { BaseInstrumentation } from './instrumentations';
export type { Instrumentation, Instrumentations } from './instrumentations';

export { createInternalLogger, defaultInternalLoggerLevel, InternalLoggerLevel } from './internalLogger';
export type { InternalLogger } from './internalLogger';

export type {
  Meta,
  MetaApp,
  MetaAttributes,
  MetaBrowser,
  MetaGetter,
  MetaItem,
  MetaPage,
  Metas,
  MetaSDK,
  MetaSDKIntegration,
  MetaSession,
  MetaUser,
} from './metas';

export { BaseTransport, getTransportBody, TransportItemType, transportItemTypeToBodyKey } from './transports';
export type {
  BeforeSendHook,
  Transport,
  TransportBody,
  TransportItem,
  TransportItemPayload,
  Transports,
} from './transports';

export { defaultUnpatchedConsole } from './unpatchedConsole';
export type { UnpatchedConsole } from './unpatchedConsole';

export {
  allLogLevels,
  BaseExtension,
  createPromiseBuffer,
  deepEqual,
  defaultLogLevel,
  genShortID,
  getCurrentTimestamp,
  isArray,
  isBoolean,
  isDomError,
  isDomException,
  isElement,
  isElementDefined,
  isError,
  isErrorDefined,
  isErrorEvent,
  isEvent,
  isEventDefined,
  isFunction,
  isInstanceOf,
  isInt,
  isMap,
  isMapDefined,
  isNull,
  isNumber,
  isObject,
  isPrimitive,
  isRegExp,
  isString,
  isSymbol,
  isSyntheticEvent,
  isThenable,
  isToString,
  isTypeof,
  isUndefined,
  LogLevel,
  noop,
} from './utils';
export type {
  BaseObject,
  BaseObjectKey,
  BaseObjectPrimitiveValue,
  BaseObjectValue,
  BufferItem,
  PromiseBuffer,
  PromiseBufferOptions,
  PromiseProducer,
} from './utils';

export { VERSION } from './version';

export { Conventions } from './semantic';
