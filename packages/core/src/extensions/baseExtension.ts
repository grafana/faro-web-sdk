import type { Config } from '../config';
import { defaultInternalLogger } from '../internalLogger';
import type { Metas } from '../metas';
import { defaultUnpatchedConsole } from '../unpatchedConsole';

import type { Extension } from './types';

export abstract class BaseExtension implements Extension {
  abstract readonly name: string;
  abstract readonly version: string;

  unpatchedConsole = defaultUnpatchedConsole;
  internalLogger = defaultInternalLogger;
  config = {} as Config;
  metas = {} as Metas;

  logDebug(...args: unknown[]): void {
    this.internalLogger.debug(`${this.name}\n`, ...args);
  }

  logInfo(...args: unknown[]): void {
    this.internalLogger.info(`${this.name}\n`, ...args);
  }

  logWarn(...args: unknown[]): void {
    this.internalLogger.warn(`${this.name}\n`, ...args);
  }

  logError(...args: unknown[]): void {
    this.internalLogger.error(`${this.name}\n`, ...args);
  }
}
