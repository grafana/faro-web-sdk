import { getBuffer } from './buffer';
import { exception } from './exception';
import { log } from './log';

export const logger = {
  get buffer() {
    return getBuffer();
  },
  exception,
  log,
};

export type Logger = typeof logger;

export { pushEvent, pushException, pushLog } from './buffer';
export type { LoggerBuffer } from './buffer';

export type { ExceptionEvent } from './exception';

export { LogLevels } from './log';
export type { LogContext, LogEvent } from './log';

export { getStackFrames } from './stackFrames';
export type { StackFrame } from './stackFrames';
