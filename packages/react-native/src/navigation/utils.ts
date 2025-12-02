import type { NavigationState, PartialState, Route } from '@react-navigation/native';

import { faro } from '@grafana/faro-core';

import { setCurrentPage } from '../metas/page';
import { setCurrentScreen } from '../metas/screen';

/**
 * Gets the currently active route from navigation state
 */
export function getCurrentRoute(
  state: NavigationState | PartialState<NavigationState> | undefined
): Route<string> | undefined {
  if (!state || !state.routes) {
    return undefined;
  }

  const route = state.routes[state.index ?? 0];

  // If this route has nested state, recursively get the active route
  if (route?.state) {
    return getCurrentRoute(route.state as NavigationState);
  }

  return route;
}

/**
 * Extracts the route name from a route object
 */
export function getRouteName(route: Route<string> | undefined): string | undefined {
  return route?.name;
}

/**
 * Handles navigation state changes and updates Faro with the new screen
 * @param state - The current navigation state
 */
export function onNavigationStateChange(state: NavigationState | undefined): void {
  if (!state) {
    return;
  }

  const currentRoute = getCurrentRoute(state);
  const screenName = getRouteName(currentRoute);

  if (screenName) {
    // Update the screen and page meta
    setCurrentScreen(screenName);
    setCurrentPage(screenName);

    // Update the view meta which will trigger VIEW_CHANGED event
    faro.api?.setView({ name: screenName });

    // Optionally push additional attributes if route has params
    if (currentRoute?.params) {
      faro.api?.pushEvent('navigation', {
        screen: screenName,
        params: JSON.stringify(currentRoute.params),
      });
    }
  }
}

/**
 * Creates a navigation state change handler
 * Use this with NavigationContainer's onStateChange prop
 *
 * @example
 * ```
 * import { NavigationContainer } from '@react-navigation/native';
 * import { createNavigationStateChangeHandler } from '@grafana/faro-react-native';
 *
 * const onStateChange = createNavigationStateChangeHandler();
 *
 * // In your component:
 * <NavigationContainer onStateChange={onStateChange}>
 *   // your navigation
 * </NavigationContainer>
 * ```
 */
export function createNavigationStateChangeHandler(): (state: NavigationState | undefined) => void {
  return onNavigationStateChange;
}
