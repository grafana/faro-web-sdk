import type { Config } from '../config';
import type { UnpatchedConsole } from '../unpatchedConsole';
import { defaultInternalLogger } from './const';
import { generateInternalLogger } from './generateInternalLogger';
import type { InternalLogger } from './types';

export let internalLogger: InternalLogger = defaultInternalLogger;

export function initializeInternalLogger(unpatchedConsole: UnpatchedConsole, config: Config): InternalLogger {
  internalLogger = generateInternalLogger(unpatchedConsole, config.internalLoggerLevel);

  return internalLogger;
}
