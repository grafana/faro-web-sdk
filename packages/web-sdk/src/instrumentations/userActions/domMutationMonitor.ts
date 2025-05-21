import { Observable } from '@grafana/faro-core';

import { MESSAGE_TYPE_DOM_MUTATION } from './const';
import type { DomMutationMessage } from './types';

export function monitorDomMutations(): Observable {
  const observable = new Observable<DomMutationMessage>();

  const observer = new MutationObserver((_mutationsList, _observer) => {
    observable.notify({ type: MESSAGE_TYPE_DOM_MUTATION });
  });

  observer.observe(document, {
    attributes: true,
    childList: true,
    subtree: true,
    characterData: true,
  });

  return observable;
}
