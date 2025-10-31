import { Observable } from '@grafana/faro-core';

import { MESSAGE_TYPE_DOM_MUTATION } from './const';
import type { DomMutationMessage } from './types';

let domMutationObservable: Observable<DomMutationMessage> | undefined;
let domMutationObserver: MutationObserver | undefined;

export function monitorDomMutations(): Observable<DomMutationMessage> {
  if (!domMutationObservable) {
    domMutationObservable = new Observable<DomMutationMessage>();
  }

  if (!domMutationObserver) {
    domMutationObserver = new MutationObserver((_mutationsList, _observer) => {
      domMutationObservable!.notify({ type: MESSAGE_TYPE_DOM_MUTATION });
    });

    domMutationObserver.observe(document, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  return domMutationObservable;
}

// Test-only utility to reset state between tests
export function __resetDomMutationMonitorForTests() {
  if (domMutationObserver) {
    domMutationObserver.disconnect();
  }
  domMutationObserver = undefined;
  domMutationObservable = undefined;
}
