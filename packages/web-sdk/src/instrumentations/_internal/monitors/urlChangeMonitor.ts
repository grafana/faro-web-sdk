import { Observable } from '@grafana/faro-core';

export const MESSAGE_TYPE_URL_CHANGE = 'url-change';

export type UrlChangeMessage = {
  type: typeof MESSAGE_TYPE_URL_CHANGE;
  from: string;
  to: string;
  trigger: 'pushState' | 'replaceState' | 'popstate' | 'hashchange' | 'navigate' | 'navigate-intercept';
};

let urlChangeObservable: Observable<UrlChangeMessage> | undefined;
let isInstrumented = false;
let lastHref: string | undefined;
let originalPushState: typeof window.history.pushState | undefined;
let originalReplaceState: typeof window.history.replaceState | undefined;
let onPopStateHandler: ((this: Window, ev: PopStateEvent) => any) | undefined;
let onHashChangeHandler: ((this: Window, ev: HashChangeEvent) => any) | undefined;
let onNavigateHandler: ((this: any, ev: any) => any) | undefined;
let originalNavigateEventIntercept: (((this: any, options?: any) => any) & { _faroWrapped?: boolean }) | undefined;

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
    const hasNavigation = 'navigation' in window && 'NavigateEvent' in (window as any);

    if (hasNavigation) {
      // Prefer Navigation API when supported: do not patch history or add popstate/hashchange listeners
      onNavigateHandler = (e: any) => {
        try {
          const destination = e?.destination as { url?: string; sameDocument?: boolean } | undefined;
          if (destination?.sameDocument && typeof destination.url === 'string') {
            emit('navigate', destination.url);
          }
        } catch (_err) {
          // Swallow to avoid impacting host app
        }
      };
      (window as any).navigation.addEventListener('navigate', onNavigateHandler as any);

      const NavigateEventConstructor = (window as any).NavigateEvent;
      if (
        NavigateEventConstructor &&
        NavigateEventConstructor.prototype &&
        typeof NavigateEventConstructor.prototype.intercept === 'function'
      ) {
        if (!originalNavigateEventIntercept) {
          originalNavigateEventIntercept = NavigateEventConstructor.prototype.intercept;
        }

        // Wrap intercept to detect soft navigations (cross-document turned same-document)
        NavigateEventConstructor.prototype.intercept = function (this: any, options?: any) {
          try {
            const canIntercept = !!this?.canIntercept;
            const destination = this?.destination as { url?: string; sameDocument?: boolean } | undefined;
            if (
              canIntercept &&
              destination &&
              destination.sameDocument === false &&
              typeof destination.url === 'string'
            ) {
              emit('navigate-intercept', destination.url);
            }
          } catch (_err) {
            // ignore
          }
          return originalNavigateEventIntercept!.call(this, options);
        } as typeof originalNavigateEventIntercept;
      }

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

// Test-only utility to reset state between tests
export function __resetUrlChangeMonitorForTests() {
  if (onPopStateHandler) {
    window.removeEventListener('popstate', onPopStateHandler);
  }
  if (onHashChangeHandler) {
    window.removeEventListener('hashchange', onHashChangeHandler);
  }
  if (onNavigateHandler && (window as any).navigation?.removeEventListener) {
    (window as any).navigation.removeEventListener('navigate', onNavigateHandler as any);
  }
  if (originalPushState) {
    window.history.pushState = originalPushState;
  }
  if (originalReplaceState) {
    window.history.replaceState = originalReplaceState;
  }
  if (originalNavigateEventIntercept && (window as any).NavigateEvent?.prototype) {
    (window as any).NavigateEvent.prototype.intercept = originalNavigateEventIntercept;
  }
  urlChangeObservable = undefined;
  isInstrumented = false;
  lastHref = undefined;
  onPopStateHandler = undefined;
  onHashChangeHandler = undefined;
  onNavigateHandler = undefined;
  originalPushState = undefined;
  originalReplaceState = undefined;
  originalNavigateEventIntercept = undefined;
}
