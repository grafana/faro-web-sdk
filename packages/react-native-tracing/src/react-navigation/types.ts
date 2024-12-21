export interface NavigationRoute {
  name: string;
  key: string;
  params?: Record<string, any>;
}

export interface NavigationContainer {
  addListener: (type: string, listener: () => void) => void;
  getCurrentRoute: () => NavigationRoute;
}

export type NavigationContainerRef = { current: NavigationContainer } | NavigationContainer;

export interface ReactNavigationInstrumentation {
  registerFaroReactNavigationContainer: (navigationContainerRef: NavigationContainerRef) => void;
}
