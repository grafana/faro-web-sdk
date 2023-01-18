import type { Config } from '../config';

import { defaultUnpatchedConsole } from './const';
import type { UnpatchedConsole } from './types';

export let unpatchedConsole: UnpatchedConsole = defaultUnpatchedConsole;

export function initializeUnpatchedConsole(config: Config): UnpatchedConsole {
  unpatchedConsole = config.unpatchedConsole ?? unpatchedConsole;

  return unpatchedConsole;
}
