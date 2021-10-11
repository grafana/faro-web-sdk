import { exception } from './exception';
import { log } from './log';

export const logger = {
  exception,
  log,
};

export type Logger = typeof logger;

export { LoggerLogLevels } from './log';
export type { LoggerLogContext } from './log';

export type { StackFrame } from './stackFrames';
