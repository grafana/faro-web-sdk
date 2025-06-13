// Type definitions for the Navigation API
// Based on MDN documentation: https://developer.mozilla.org/en-US/docs/Web/API/Navigation

export interface NavigationActivation {
  // Properties for cross-document navigation activation
  entry: NavigationHistoryEntry | null;
  from: NavigationHistoryEntry | null;
}

export interface NavigationHistoryEntry {
  readonly id: string;
  readonly key: string;
  readonly index: number;
  readonly sameDocument: boolean;
  readonly url: string | null;
  getState(): any;
}

export interface NavigationTransition {
  readonly finished: Promise<void>;
  readonly from: NavigationHistoryEntry;
  readonly navigationType: NavigationType;
  readonly rollback?: () => void;
}

export type NavigationType = 'push' | 'replace' | 'reload' | 'traverse';

export interface NavigationResult {
  readonly committed: Promise<NavigationHistoryEntry>;
  readonly finished: Promise<NavigationHistoryEntry>;
}

export interface NavigationNavigateOptions {
  state?: any;
  info?: any;
  replace?: boolean;
}

export interface NavigationReloadOptions {
  state?: any;
  info?: any;
}

export interface NavigationUpdateCurrentEntryOptions {
  state: any;
}

export interface NavigationEventMap {
  currententrychange: NavigationCurrentEntryChangeEvent;
  navigate: NavigateEvent;
  navigateerror: NavigationErrorEvent;
  navigatesuccess: NavigationSuccessEvent;
}

export interface NavigationCurrentEntryChangeEvent extends Event {
  readonly from: NavigationHistoryEntry | null;
  readonly navigationType: NavigationType | null;
}

export interface NavigateEvent extends Event {
  readonly canIntercept: boolean;
  readonly destination: NavigationDestination;
  readonly downloadRequest: string | null;
  readonly formData: FormData | null;
  readonly hashChange: boolean;
  readonly info: any;
  readonly navigationType: NavigationType;
  readonly signal: AbortSignal;
  readonly userInitiated: boolean;

  intercept(options?: NavigationInterceptOptions): void;
  scroll(): void;
}

export interface NavigationDestination {
  readonly index: number;
  readonly key: string | null;
  readonly id: string | null;
  readonly url: string;
  readonly sameDocument: boolean;
  getState(): any;
}

export interface NavigationInterceptOptions {
  handler?: () => Promise<void> | void;
  focusReset?: 'after-transition' | 'manual';
  scroll?: 'after-transition' | 'manual';
}

export interface NavigationErrorEvent extends Event {
  readonly error: any;
  readonly filename: string;
  readonly lineno: number;
  readonly colno: number;
  readonly message: string;
}

export interface NavigationSuccessEvent extends Event {
  // Success event properties
}

export interface Navigation extends EventTarget {
  // Properties
  readonly activation: NavigationActivation | null;
  readonly canGoBack: boolean;
  readonly canGoForward: boolean;
  readonly currentEntry: NavigationHistoryEntry | null;
  readonly transition: NavigationTransition | null;

  // Methods
  back(options?: NavigationNavigateOptions): NavigationResult;
  entries(): NavigationHistoryEntry[];
  forward(options?: NavigationNavigateOptions): NavigationResult;
  navigate(url: string | URL, options?: NavigationNavigateOptions): NavigationResult;
  reload(options?: NavigationReloadOptions): NavigationResult;
  traverseTo(key: string, options?: NavigationNavigateOptions): NavigationResult;
  updateCurrentEntry(options: NavigationUpdateCurrentEntryOptions): void;

  // Event handlers
  addEventListener<K extends keyof NavigationEventMap>(
    type: K,
    listener: (this: Navigation, ev: NavigationEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener<K extends keyof NavigationEventMap>(
    type: K,
    listener: (this: Navigation, ev: NavigationEventMap[K]) => any,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void;
}

// Extend the Window interface to include the navigation property
declare global {
  interface Window {
    readonly navigation: Navigation;
  }
}
