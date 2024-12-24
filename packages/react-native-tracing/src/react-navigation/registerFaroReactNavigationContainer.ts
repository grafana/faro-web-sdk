import { api, internalLogger } from './dependencies';
import { handleNavigationComplete, handleNavigationStart, initializeInitialRoute } from './handlers';
import type { NavigationContainerRef, NavigationState } from './types';

/**
 * Registers route change tracking for React Navigation.
 * Tracks navigation timing and emits route change events.
 *
 * @param navigationContainerRef - Ref to a NavigationContainer
 */
export function registerFaroReactNavigationContainer(navigationContainerRef: NavigationContainerRef): void {
  const navigationContainer = navigationContainerRef.current;

  if (!navigationContainer) {
    internalLogger.warn('Received invalid navigation container ref');
    return;
  }

  const otel = api.getOTEL();

  if (!otel) {
    internalLogger.warn('OpenTelemetry not initialized');
    return;
  }

  const tracer = otel.trace.getTracer('react-navigation');
  const navigationState: NavigationState = {
    activeSpan: undefined,
    lastRoute: {},
    isInitialized: false,
    stateChangeTimeout: undefined,
  };

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
