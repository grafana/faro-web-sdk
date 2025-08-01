import { registerFaroReactNavigationContainer } from './registerFaroReactNavigationContainer';
import type { ReactNavigationInstrumentation } from './types';

/**
 * Initializes React Navigation instrumentation for Faro
 */
export function initializeReactNavigationInstrumentation(): ReactNavigationInstrumentation {
  return {
    registerFaroReactNavigationContainer,
  };
}
