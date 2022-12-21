import type { Config } from '../config';
import type { InternalLogger } from '../internalLogger';
import { defaultInternalLogger } from '../internalLogger';

export interface Extension {
  readonly name: string;
  readonly version: string;

  config: Config;
  internalLogger: InternalLogger;

  logDebug(...args: unknown[]): void;
  logInfo(...args: unknown[]): void;
  logWarn(...args: unknown[]): void;
  logError(...args: unknown[]): void;
}

export abstract class BaseExtension implements Extension {
  abstract readonly name: string;
  abstract readonly version: string;

  config: Config = {} as Config;
  internalLogger: InternalLogger = defaultInternalLogger;

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
