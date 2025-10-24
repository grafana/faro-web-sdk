import { Observable } from '@grafana/faro-core';

export const MESSAGE_TYPE_URL_CHANGE = 'url-change';

export type UrlChangeMessage = {
  type: typeof MESSAGE_TYPE_URL_CHANGE;
  from: string;
  to: string;
  trigger: 'pushState' | 'replaceState' | 'popstate' | 'hashchange';
};

export function monitorUrlChanges(): Observable<UrlChangeMessage> {
  const observable = new Observable<UrlChangeMessage>();
  let lastHref = location.href;

  function emit(trigger: UrlChangeMessage['trigger']) {
    const next = location.href;
    if (next !== lastHref) {
      observable.notify({ type: MESSAGE_TYPE_URL_CHANGE, from: lastHref, to: next, trigger });
      lastHref = next;
    }
  }

  const originalPushState = window.history.pushState;
  window.history.pushState = function (...args: Parameters<typeof history.pushState>) {
    const result = originalPushState.apply(window.history, args as any);
    emit('pushState');
    return result;
  } as typeof history.pushState;

  const originalReplaceState = window.history.replaceState;
  window.history.replaceState = function (...args: Parameters<typeof history.replaceState>) {
    const result = originalReplaceState.apply(window.history, args as any);
    emit('replaceState');
    return result;
  } as typeof history.replaceState;

  window.addEventListener('popstate', () => emit('popstate'));
  window.addEventListener('hashchange', () => emit('hashchange'));

  return observable;
}


