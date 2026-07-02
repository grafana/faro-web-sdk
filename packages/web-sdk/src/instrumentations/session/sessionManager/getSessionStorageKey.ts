import { faro } from '@grafana/faro-core';

import { STORAGE_KEY } from './sessionConstants';

/**
 * Build the web-storage key for the session.
 *
 * When multiple Faro instances share a page (e.g. a micro-frontend setup) they would otherwise read
 * and write the same `com.grafana.faro.session` key and clobber each other's session. To isolate
 * them, the key is suffixed with a per-instance namespace resolved at config time (see
 * `makeCoreConfig`): an explicit `sessionTracking.storageKeyNamespace`, falling back to the app
 * name, then to the app key parsed from the collector URL.
 *
 * When no namespace can be resolved the bare key is used, preserving the previous behavior.
 */
export function getSessionStorageKey(): string {
  const namespace = faro.config?.sessionTracking?.storageKeyNamespace;
  return namespace ? `${STORAGE_KEY}_${namespace}` : STORAGE_KEY;
}
