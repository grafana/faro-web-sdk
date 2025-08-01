import type { Span } from '@opentelemetry/api';

export interface NavigationRoute {
  name: string;
  key: string;
  params?: Record<string, any>;
}

export interface NavigationContainer {
  addListener: (type: string, listener: () => void) => void;
  getCurrentRoute: () => NavigationRoute;
}

export type NavigationContainerRef = { current: NavigationContainer };

export interface ReactNavigationInstrumentation {
  registerFaroReactNavigationContainer: (navigationContainerRef: NavigationContainerRef) => void;
}

export interface NavigationState {
  activeSpan: Span | undefined;
  fromRoute: string;
  isInitialized: boolean;
  stateChangeTimeout?: ReturnType<typeof setTimeout>;
}

export const SPAN_NAME = 'route-change';

export const SPAN_ATTRIBUTES = {
  type: 'navigation.type',
  fromRoute: 'navigation.from_route',
  toRoute: 'navigation.to_route',
} as const;

export const ROUTE_CHANGE_TIMEOUT_MS = 10000;
