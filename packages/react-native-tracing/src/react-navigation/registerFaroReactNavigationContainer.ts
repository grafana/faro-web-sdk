import { api, internalLogger } from './dependencies';
import { handleNavigationComplete, handleNavigationStart, initializeInitialRoute } from './handlers';
import { navigationState } from './metaPage';
import type { NavigationContainerRef } from './types';

/**
 * Registers route change tracking for React Navigation.
 * Tracks navigation timing and emits route change events.
 *
 * @param navigationContainerRef - Ref to a NavigationContainer
 */
export function registerFaroReactNavigationContainer(navigationContainerRef: NavigationContainerRef): void {
  const navigationContainer = navigationContainerRef.current;

  if (!navigationContainer) {
    internalLogger.error('Received invalid navigation container ref');
    return;
  }

  const otel = api.getOTEL();

  if (!otel) {
    internalLogger.error('OpenTelemetry not initialized');
    return;
  }

  const tracer = otel.trace.getTracer('react-navigation');

  initializeInitialRoute(navigationContainer, navigationState);

  // Listen for navigation event start (when an action 'navigate' is dispatched)
  navigationContainer.addListener('__unsafe_action__', () => {
    internalLogger.debug('Navigation start: ', navigationContainer.getCurrentRoute());
    handleNavigationStart(navigationState, tracer, navigationContainer.getCurrentRoute());
  });

  // Listen for navigation event complete (when the action is completed)
  navigationContainer.addListener('state', () => {
    internalLogger.debug('Navigation complete: ', navigationContainer.getCurrentRoute());
    handleNavigationComplete(navigationState, navigationContainer.getCurrentRoute());
  });
}
