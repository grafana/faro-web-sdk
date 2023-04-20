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
