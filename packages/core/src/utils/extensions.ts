import type { Config } from '../config';
import { defaultInternalLogger } from '../internalLogger';
import type { InternalLogger } from '../internalLogger';
import type { Metas } from '../metas';
import { defaultUnpatchedConsole } from '../unpatchedConsole';
import type { UnpatchedConsole } from '../unpatchedConsole';

export interface Extension {
  readonly name: string;
  readonly version: string;

  internalLogger: InternalLogger;
  unpatchedConsole: UnpatchedConsole;
  config: Config;
  metas: Metas;

  logDebug(...args: unknown[]): void;
  logInfo(...args: unknown[]): void;
  logWarn(...args: unknown[]): void;
  logError(...args: unknown[]): void;
}

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
