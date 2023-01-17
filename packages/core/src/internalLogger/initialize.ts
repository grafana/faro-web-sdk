import type { Config } from '../config';
import type { UnpatchedConsole } from '../unpatchedConsole';

import { defaultInternalLogger } from './const';
import { createInternalLogger } from './createInternalLogger';
import type { InternalLogger } from './types';

export let internalLogger: InternalLogger = defaultInternalLogger;

export function initializeInternalLogger(unpatchedConsole: UnpatchedConsole, config: Config): InternalLogger {
  internalLogger = createInternalLogger(unpatchedConsole, config.internalLoggerLevel);

  return internalLogger;
}
