import { isToString } from '@grafana/faro-core';

/** Recognize worker globals without treating SSR or Node as a browser worker. */
export function isWorker(): boolean {
  return (
    typeof self !== 'undefined' &&
    ['DedicatedWorkerGlobalScope', 'SharedWorkerGlobalScope', 'ServiceWorkerGlobalScope'].some((scope) =>
      isToString(self, scope)
    )
  );
}
