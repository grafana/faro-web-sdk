import type { Config } from '../config';
import type { OriginalConsole } from './types';

export let originalConsole: OriginalConsole = { ...console };

export function initializeOriginalConsole(config: Config): OriginalConsole {
  originalConsole = config.originalConsole ?? originalConsole;

  return originalConsole;
}
