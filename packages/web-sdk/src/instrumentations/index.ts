export { SessionInstrumentation } from './session';

export { ConsoleInstrumentation } from './console';
export type { ConsoleInstrumentationOptions } from './console';

export {
  buildStackFrame,
  ErrorsInstrumentation,
  getDataFromSafariExtensions,
  getStackFramesFromError,
  parseStacktrace,
} from './errors';
export type { ErrorEvent, ExtendedPromiseRejectionEvent } from './errors';

export { ViewInstrumentation } from './view';

export { WebVitalsInstrumentation } from './webVitals';

export {
  PersistentSessionsManager,
  VolatileSessionsManager,
  MAX_SESSION_PERSISTENCE_TIME,
  MAX_SESSION_PERSISTENCE_TIME_BUFFER,
  SESSION_EXPIRATION_TIME,
  SESSION_INACTIVITY_TIME,
  STORAGE_KEY,
} from './session';

export { PerformanceInstrumentation } from './performance';
