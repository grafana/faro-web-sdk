import type { Config } from '../config';
import { allLogLevels } from '../utils';
import type { OriginalConsole } from './types';

export let originalConsole: OriginalConsole = console;

export function initializeOriginalConsole(config: Config): OriginalConsole {
  originalConsole =
    config.originalConsole ??
    allLogLevels.reduce(
      (acc, level) => {
        /* eslint-disable-next-line no-console */
        acc[level] = console[level];

        return acc;
      },
      { ...console }
    );

  return originalConsole;
}
