import type { Config } from '../config';
import type { UnpatchedConsole } from './types';

export let unpatchedConsole: UnpatchedConsole = { ...console };

export function initializeUnpatchedConsole(config: Config): UnpatchedConsole {
  unpatchedConsole = config.unpatchedConsole ?? unpatchedConsole;

  return unpatchedConsole;
}
