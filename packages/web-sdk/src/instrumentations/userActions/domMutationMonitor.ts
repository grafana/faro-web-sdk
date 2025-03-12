import { Observable } from '@grafana/faro-core';

import { MESSAGE_TYPE_DOM_MUTATION } from './const';

export function monitorDomMutations(): Observable {
  const observable = new Observable();

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
