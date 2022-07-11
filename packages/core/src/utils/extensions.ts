import { agent } from '../agent';
import type { Agent } from '../agent';

export interface Extension {
  readonly name: string;
  readonly version: string;

  get agent(): Agent;

  logDebug(...args: unknown[]): void;
  logInfo(...args: unknown[]): void;
  logWarn(...args: unknown[]): void;
  logError(...args: unknown[]): void;
}

export abstract class BaseExtension implements Extension {
  abstract readonly name: string;
  abstract readonly version: string;

  get agent(): Agent {
    return agent;
  }

  logDebug(...args: unknown[]): void {
    this.agent.internalLogger.debug(this.name, ...args);
  }

  logInfo(...args: unknown[]): void {
    this.agent.internalLogger.info(this.name, ...args);
  }

  logWarn(...args: unknown[]): void {
    this.agent.internalLogger.warn(this.name, ...args);
  }

  logError(...args: unknown[]): void {
    this.agent.internalLogger.error(this.name, ...args);
  }
}
