import { genShortID, Observable } from '@grafana/faro-core';

export const MESSAGE_TYPE_URL_CHANGE = 'url-change';

export type UrlChangeMessage = {
  type: typeof MESSAGE_TYPE_URL_CHANGE;
  from: string;
  to: string;
  trigger: 'pushState' | 'replaceState' | 'popstate' | 'hashchange';
};

let urlChangeObservable: Observable<UrlChangeMessage> | undefined;
let isInstrumented = false;
let lastHref: string | undefined;
let originalPushState: typeof window.history.pushState | undefined;
let originalReplaceState: typeof window.history.replaceState | undefined;
let onPopStateHandler: ((this: Window, ev: PopStateEvent) => any) | undefined;
let onHashChangeHandler: ((this: Window, ev: HashChangeEvent) => any) | undefined;
let onCurrentEntryChangeHandler: ((this: any, ev: any) => any) | undefined;

function getNavigationTrigger(navigationType: string | undefined): UrlChangeMessage['trigger'] | undefined {
  switch (navigationType) {
    case 'push':
      return 'pushState';
    case 'replace':
      return 'replaceState';
    case 'traverse':
    case undefined:
      return 'popstate';
    default:
      return undefined;
  }
}

export function monitorUrlChanges(): Observable<UrlChangeMessage> {
  if (!urlChangeObservable) {
    urlChangeObservable = new Observable<UrlChangeMessage>();
    lastHref = location.href;
  }

  function emit(trigger: UrlChangeMessage['trigger'], toOverride?: string) {
    const next = toOverride ?? location.href;
    if (next !== lastHref) {
      urlChangeObservable!.notify({ type: MESSAGE_TYPE_URL_CHANGE, from: lastHref!, to: next, trigger });
      lastHref = next;
    }
  }

  if (!isInstrumented) {
    const navigationApi = (window as any).navigation;
    // currentEntry is null where the API has entries and events disabled (e.g. opaque origins), and
    // currententrychange never fires there
    const hasNavigation =
      typeof navigationApi?.addEventListener === 'function' &&
      typeof navigationApi?.removeEventListener === 'function' &&
      navigationApi.currentEntry != null;

    if (hasNavigation) {
      // Prefer Navigation API when supported: do not patch history or add popstate/hashchange listeners
      onCurrentEntryChangeHandler = (event: any) => {
        try {
          const currentUrl = navigationApi.currentEntry?.url;
          const trigger = getNavigationTrigger(event?.navigationType);
          if (typeof currentUrl === 'string' && trigger) {
            emit(trigger, currentUrl);
          }
        } catch (_err) {
          // Swallow to avoid impacting host app
        }
      };
      navigationApi.addEventListener('currententrychange', onCurrentEntryChangeHandler as any);

      isInstrumented = true;
    } else {
      // Fallback: history API patching + popstate/hashchange
      if (!originalPushState) {
        originalPushState = window.history.pushState;
      }
      window.history.pushState = function (...args: Parameters<typeof window.history.pushState>) {
        const result = originalPushState!.apply(window.history, args as any);
        emit('pushState');
        return result;
      } as typeof window.history.pushState;

      if (!originalReplaceState) {
        originalReplaceState = window.history.replaceState;
      }
      window.history.replaceState = function (...args: Parameters<typeof window.history.replaceState>) {
        const result = originalReplaceState!.apply(window.history, args as any);
        emit('replaceState');
        return result;
      } as typeof window.history.replaceState;

      onPopStateHandler = () => emit('popstate');
      onHashChangeHandler = () => emit('hashchange');
      window.addEventListener('popstate', onPopStateHandler);
      window.addEventListener('hashchange', onHashChangeHandler);

      isInstrumented = true;
    }
  }

  return urlChangeObservable;
}

export const MESSAGE_TYPE_NAVIGATION_TRANSITION_START = 'navigation-transition-start';
export const MESSAGE_TYPE_NAVIGATION_TRANSITION_END = 'navigation-transition-end';

export type NavigationTransitionStartMessage = {
  type: typeof MESSAGE_TYPE_NAVIGATION_TRANSITION_START;
  transitionId: string;
};

export type NavigationTransitionEndMessage = {
  type: typeof MESSAGE_TYPE_NAVIGATION_TRANSITION_END;
  transitionId: string;
};

type NavigationTransitionMessage = NavigationTransitionStartMessage | NavigationTransitionEndMessage;

let navigationTransitionObservable: Observable<NavigationTransitionMessage> | undefined;
let transitionNavigation: any;
let onNavigateHandler: (() => void) | undefined;
let trackedTransitions = new WeakSet<object>();

/**
 * Monitors intercepted Navigation API navigations until they commit. A router can defer the commit with
 * `intercept({ precommitHandler })`, so the URL change may arrive long after the navigation started.
 */
export function monitorNavigationTransitions(): Observable<NavigationTransitionMessage> {
  if (navigationTransitionObservable) {
    return navigationTransitionObservable;
  }

  const observable = new Observable<NavigationTransitionMessage>();
  navigationTransitionObservable = observable;

  const navigationApi = (window as any).navigation;
  if (typeof navigationApi?.addEventListener !== 'function') {
    return observable;
  }

  onNavigateHandler = () => {
    // Defer until all navigate listeners have run. For browser-initiated navigations, microtasks run between
    // listeners, so a microtask would run before a router listener registered after ours calls intercept().
    setTimeout(() => {
      try {
        // Only intercepted navigations have a transition. Without precommitHandler support there is no
        // `committed` promise, and those navigations always commit immediately.
        const transition = navigationApi.transition;
        const committed = transition?.committed;
        // The timer of an earlier navigation can run after a later one has started and see its transition, so
        // count each transition once, whichever timer sees it first
        if (typeof committed?.then !== 'function' || trackedTransitions.has(transition)) {
          return;
        }
        trackedTransitions.add(transition);

        const transitionId = genShortID();
        observable.notify({ type: MESSAGE_TYPE_NAVIGATION_TRANSITION_START, transitionId });

        const onSettled = () => {
          observable.notify({ type: MESSAGE_TYPE_NAVIGATION_TRANSITION_END, transitionId });
        };
        committed.then(onSettled, onSettled);
      } catch (_err) {
        // Swallow to avoid impacting host app
      }
    }, 0);
  };
  navigationApi.addEventListener('navigate', onNavigateHandler);
  transitionNavigation = navigationApi;

  return observable;
}

// Test-only utility to reset state between tests
export function __resetUrlChangeMonitorForTests(): void {
  if (onPopStateHandler) {
    window.removeEventListener('popstate', onPopStateHandler);
  }
  if (onHashChangeHandler) {
    window.removeEventListener('hashchange', onHashChangeHandler);
  }
  if (onCurrentEntryChangeHandler && (window as any).navigation?.removeEventListener) {
    (window as any).navigation.removeEventListener('currententrychange', onCurrentEntryChangeHandler as any);
  }
  if (originalPushState) {
    window.history.pushState = originalPushState;
  }
  if (originalReplaceState) {
    window.history.replaceState = originalReplaceState;
  }
  if (onNavigateHandler) {
    transitionNavigation?.removeEventListener?.('navigate', onNavigateHandler);
  }
  urlChangeObservable = undefined;
  navigationTransitionObservable = undefined;
  transitionNavigation = undefined;
  onNavigateHandler = undefined;
  trackedTransitions = new WeakSet<object>();
  isInstrumented = false;
  lastHref = undefined;
  onPopStateHandler = undefined;
  onHashChangeHandler = undefined;
  onCurrentEntryChangeHandler = undefined;
  originalPushState = undefined;
  originalReplaceState = undefined;
}
