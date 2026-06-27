import { Observable } from '@grafana/faro-core';

export const MESSAGE_TYPE_URL_CHANGE = 'url-change';

export type UrlChangeMessage = {
  type: typeof MESSAGE_TYPE_URL_CHANGE;
  from: string;
  to: string;
  trigger: 'pushState' | 'replaceState' | 'popstate' | 'hashchange' | 'currententrychange';
};

let urlChangeObservable: Observable<UrlChangeMessage> | undefined;
let isInstrumented = false;
let lastHref: string | undefined;
let originalPushState: typeof window.history.pushState | undefined;
let originalReplaceState: typeof window.history.replaceState | undefined;
let onPopStateHandler: ((this: Window, ev: PopStateEvent) => any) | undefined;
let onHashChangeHandler: ((this: Window, ev: HashChangeEvent) => any) | undefined;
let onCurrentEntryChangeHandler: ((this: any, ev: any) => any) | undefined;

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
    const navigation = (window as any).navigation;
    const hasNavigation =
      typeof navigation?.addEventListener === 'function' &&
      typeof navigation?.removeEventListener === 'function' &&
      'currentEntry' in navigation;

    if (hasNavigation) {
      // Prefer Navigation API when supported: do not patch history or add popstate/hashchange listeners
      onCurrentEntryChangeHandler = () => {
        try {
          const currentUrl = navigation.currentEntry?.url;
          if (typeof currentUrl === 'string') {
            emit('currententrychange', currentUrl);
          }
        } catch (_err) {
          // Swallow to avoid impacting host app
        }
      };
      navigation.addEventListener('currententrychange', onCurrentEntryChangeHandler as any);

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
  if (onCurrentEntryChangeHandler && (window as any).navigation?.removeEventListener) {
    (window as any).navigation.removeEventListener('currententrychange', onCurrentEntryChangeHandler as any);
  }
  if (originalPushState) {
    window.history.pushState = originalPushState;
  }
  if (originalReplaceState) {
    window.history.replaceState = originalReplaceState;
  }
  urlChangeObservable = undefined;
  isInstrumented = false;
  lastHref = undefined;
  onPopStateHandler = undefined;
  onHashChangeHandler = undefined;
  onCurrentEntryChangeHandler = undefined;
  originalPushState = undefined;
  originalReplaceState = undefined;
}
