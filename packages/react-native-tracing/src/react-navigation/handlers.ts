import { SpanStatusCode, Tracer } from '@opentelemetry/api';

import { EVENT_ROUTE_CHANGE } from '@grafana/faro-core';

import { api, internalLogger } from './dependencies';
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
  // Record source route
  state.fromRoute = currentRoute.name;

  // Start new navigation span
  state.activeSpan = tracer.startSpan(SPAN_NAME, {
    attributes: {
      [SPAN_ATTRIBUTES.type]: 'navigation',
      [SPAN_ATTRIBUTES.fromRoute]: state.fromRoute,
    },
  });

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

  const { activeSpan, fromRoute } = state;

  // Update span with final route information
  activeSpan.setAttributes({
    [SPAN_ATTRIBUTES.toRoute]: currentRoute.name,
  });

  // Complete the navigation span
  activeSpan.setStatus({ code: SpanStatusCode.OK });
  activeSpan.end();
  state.activeSpan = undefined;

  // Update view and emit events
  api.setView({ name: currentRoute.name });

  api.pushEvent(EVENT_ROUTE_CHANGE, {
    fromRoute: fromRoute,
    toRoute: currentRoute.name,
  });

  // Update route state
  state.fromRoute = currentRoute.name;
}

/**
 * Initializes route tracking for the initial screen.
 */
export function initializeInitialRoute(navigationContainer: NavigationContainer, state: NavigationState): void {
  const initialRoute = navigationContainer.getCurrentRoute();
  if (initialRoute && !state.isInitialized) {
    api.setView({ name: initialRoute.name });
    api.pushEvent(EVENT_ROUTE_CHANGE, {
      fromRoute: state.fromRoute,
      toRoute: initialRoute.name,
    });
    state.fromRoute = initialRoute.name;
    state.isInitialized = true;
  }
}
