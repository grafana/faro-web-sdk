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

export { WebVitalsInstrumentation } from './webVitals';
