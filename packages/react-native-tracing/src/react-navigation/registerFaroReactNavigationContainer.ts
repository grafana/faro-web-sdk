import { EVENT_ROUTE_CHANGE } from '@grafana/faro-web-sdk';

import { api, internalLogger } from './dependencies';
import { updateCurrentRoute } from './metaPage';
import type { NavigationContainer, NavigationContainerRef } from './types';

let lastRoute: {
  fromRoute?: string;
} = {};

/**
 * Registers route change tracking for React Navigation.
 
 * @param navigationContainerRef Ref to a NavigationContainer
 */
export function registerFaroReactNavigationContainer(navigationContainerRef: NavigationContainerRef): void {
  console.log('registerFaroReactNavigationContainer');
  let navigationContainer: NavigationContainer;

  // Handle both ref and direct container
  if ('current' in navigationContainerRef) {
    navigationContainer = navigationContainerRef.current;
  } else {
    navigationContainer = navigationContainerRef;
  }

  if (!navigationContainer) {
    internalLogger.warn('Received invalid navigation container ref');
    return;
  }

  const initialRoute = navigationContainer.getCurrentRoute();
  if (initialRoute) {
    api.setView({
      name: initialRoute.name,
    });
    updateCurrentRoute(initialRoute.name);
  }

  navigationContainer.addListener('state', () => {
    const currentRoute = navigationContainer.getCurrentRoute();

    if (!currentRoute) {
      return;
    }

    // Update view and page meta
    api.setView({
      name: currentRoute.name,
    });
    updateCurrentRoute(currentRoute.name);

    // Send route change event
    api.pushEvent(EVENT_ROUTE_CHANGE, {
      toRoute: currentRoute.name,
      ...lastRoute,
    });

    // Update last route for next change
    lastRoute = {
      fromRoute: currentRoute.name,
    };
  });
}
