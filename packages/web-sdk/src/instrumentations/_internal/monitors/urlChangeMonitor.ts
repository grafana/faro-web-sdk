import { Observable } from '@grafana/faro-core';

export const MESSAGE_TYPE_URL_CHANGE = 'url-change';

export type UrlChangeMessage = {
  type: typeof MESSAGE_TYPE_URL_CHANGE;
  from: string;
  to: string;
  trigger: 'pushState' | 'replaceState' | 'popstate' | 'hashchange' | 'reload';
};

let urlChangeObservable: Observable<UrlChangeMessage> | undefined;
let isInstrumented = false;
let lastHref: string | undefined;
let originalPushState: typeof window.history.pushState | undefined;
let originalReplaceState: typeof window.history.replaceState | undefined;
let onPopStateHandler: ((this: Window, ev: PopStateEvent) => any) | undefined;
let onHashChangeHandler: ((this: Window, ev: HashChangeEvent) => any) | undefined;
let onCurrentEntryChangeHandler: ((this: any, ev: any) => any) | undefined;

function getNavigationTrigger(navigationType: string | undefined): UrlChangeMessage['trigger'] {
  switch (navigationType) {
    case 'push':
      return 'pushState';
    case 'replace':
      return 'replaceState';
    case 'reload':
      return 'reload';
    case 'traverse':
    default:
      return 'popstate';
  }
}

export function monitorUrlChanges(): Observable<UrlChangeMessage> {
  if (!urlChangeObservable) {
    urlChangeObservable = new Observable<UrlChangeMessage>();
    lastHref = location.href;
  }

  function emit(trigger: UrlChangeMessage['trigger'], toOverride?: string, fromOverride?: string) {
    const next = toOverride ?? location.href;
    const previous = fromOverride ?? lastHref;
    if (previous && next !== previous) {
      urlChangeObservable!.notify({ type: MESSAGE_TYPE_URL_CHANGE, from: previous, to: next, trigger });
      lastHref = next;
    }
  }

  if (!isInstrumented) {
    const navigationApi = (window as any).navigation;
    const hasNavigation =
      typeof navigationApi?.addEventListener === 'function' &&
      typeof navigationApi?.removeEventListener === 'function' &&
      'currentEntry' in navigationApi;

    if (hasNavigation) {
      // Prefer Navigation API when supported: do not patch history or add popstate/hashchange listeners
      onCurrentEntryChangeHandler = (event: any) => {
        try {
          const currentUrl = navigationApi.currentEntry?.url;
          if (typeof currentUrl === 'string') {
            const fromUrl = event?.from?.url;
            const trigger = getNavigationTrigger(event?.navigationType);
            emit(trigger, currentUrl, typeof fromUrl === 'string' ? fromUrl : undefined);
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
