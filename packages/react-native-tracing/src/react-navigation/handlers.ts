import { SpanStatusCode, Tracer } from '@opentelemetry/api';

import { EVENT_ROUTE_CHANGE } from '@grafana/faro-web-sdk';

import { api, internalLogger } from './dependencies';
import { updateCurrentRoute } from './metaPage';
import { NavigationContainer, NavigationState, ROUTE_CHANGE_TIMEOUT_MS, SPAN_ATTRIBUTES, SPAN_NAME } from './types';

/**
 * Cleans up the navigation state and marks the span as failed.
 */
function discardNavigation(state: NavigationState, reason: string): void {
  if (state.activeSpan) {
    state.activeSpan.setStatus({ code: SpanStatusCode.ERROR, message: reason });
    state.activeSpan.end();
    state.activeSpan = undefined;
  }

  if (state.stateChangeTimeout) {
    clearTimeout(state.stateChangeTimeout);
    state.stateChangeTimeout = undefined;
  }
}

/**
 * Handles the start of a navigation action.
 * Creates a new span and records the source route.
 */
export function handleNavigationStart(
  state: NavigationState,
  tracer: Tracer,
  currentRoute: { name: string } | undefined
): void {
  if (!currentRoute) {
    return;
  }

  // Clean up existing navigation if any
  if (state.activeSpan) {
    internalLogger.debug('Interrupting active navigation');
    discardNavigation(state, 'Navigation interrupted');
  }

  // Start new navigation span
  state.activeSpan = tracer.startSpan(SPAN_NAME, {
    attributes: {
      [SPAN_ATTRIBUTES.type]: 'navigation',
      [SPAN_ATTRIBUTES.fromRoute]: currentRoute.name,
    },
  });

  // Record source route
  state.lastRoute = { fromRoute: currentRoute.name };

  // Set timeout for navigation completion
  state.stateChangeTimeout = setTimeout(() => {
    internalLogger.debug('Navigation timeout exceeded');
    discardNavigation(state, 'Navigation timeout');
  }, ROUTE_CHANGE_TIMEOUT_MS);
}

/**
 * Handles the completion of a navigation action.
 * Updates and completes the navigation span.
 */
export function handleNavigationComplete(state: NavigationState, currentRoute: { name: string } | undefined): void {
  if (!currentRoute || !state.activeSpan) {
    return;
  }

  // Clear timeout since navigation completed
  if (state.stateChangeTimeout) {
    clearTimeout(state.stateChangeTimeout);
    state.stateChangeTimeout = undefined;
  }

  const { activeSpan, lastRoute } = state;

  // Update span with final route information
  activeSpan.setAttributes({
    [SPAN_ATTRIBUTES.toRoute]: currentRoute.name,
    [SPAN_ATTRIBUTES.fromRoute]: lastRoute.fromRoute ?? 'unknown',
  });

  // Complete the navigation span
  activeSpan.setStatus({ code: SpanStatusCode.OK });
  activeSpan.end();
  state.activeSpan = undefined;

  // Update view and emit events
  api.setView({ name: currentRoute.name });
  updateCurrentRoute(currentRoute.name);

  api.pushEvent(EVENT_ROUTE_CHANGE, {
    toRoute: currentRoute.name,
    ...lastRoute,
  });

  // Update route state
  state.lastRoute = { fromRoute: currentRoute.name };
}

/**
 * Initializes route tracking for the initial screen.
 */
export function initializeInitialRoute(navigationContainer: NavigationContainer, state: NavigationState): void {
  const initialRoute = navigationContainer.getCurrentRoute();
  if (initialRoute && !state.isInitialized) {
    api.setView({ name: initialRoute.name });
    updateCurrentRoute(initialRoute.name);
    state.isInitialized = true;
  }
}
