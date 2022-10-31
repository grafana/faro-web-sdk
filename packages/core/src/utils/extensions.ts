import { faro } from '../sdk';
import type { Faro } from '../sdk';

export interface Extension {
  readonly name: string;
  readonly version: string;

  get faro(): Faro;

  logDebug(...args: unknown[]): void;
  logInfo(...args: unknown[]): void;
  logWarn(...args: unknown[]): void;
  logError(...args: unknown[]): void;
}

export abstract class BaseExtension implements Extension {
  abstract readonly name: string;
  abstract readonly version: string;

  get faro(): Faro {
    return faro;
  }

  logDebug(...args: unknown[]): void {
    this.faro?.internalLogger?.debug(`${this.name}\n`, ...args);
  }

  logInfo(...args: unknown[]): void {
    this.faro?.internalLogger?.info(`${this.name}\n`, ...args);
  }

  logWarn(...args: unknown[]): void {
    this.faro?.internalLogger?.warn(`${this.name}\n`, ...args);
  }

  logError(...args: unknown[]): void {
    this.faro?.internalLogger?.error(`${this.name}\n`, ...args);
  }
}
