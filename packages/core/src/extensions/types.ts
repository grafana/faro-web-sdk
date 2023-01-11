import type { Config } from '../config';
import type { InternalLogger } from '../internalLogger';
import type { Metas } from '../metas';
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
