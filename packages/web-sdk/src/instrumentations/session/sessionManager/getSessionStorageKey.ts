import { STORAGE_KEY } from './sessionConstants';

/**
 * Build the web-storage key for the session.
 *
 * When multiple Faro instances share a page (e.g. a micro-frontend setup) they would otherwise read
 * and write the same `com.grafana.faro.session` key and clobber each other's session. Namespacing is
 * opt-in (via `sessionTracking.isolatedSessions` or an explicit `sessionTracking.storageKeyNamespace`):
 * when enabled, the key is suffixed with a per-instance namespace resolved at config time (see
 * `makeCoreConfig`): explicit `storageKeyNamespace`, falling back to the app name, then the app key
 * parsed from the collector URL.
 *
 * The namespace must be captured from the instance config at construction time — not read from the
 * global `faro` singleton — so that each instance uses its own key even when multiple instances
 * share a page.
 *
 * When no namespace can be resolved the bare key is used, preserving the previous behavior.
 */
export function getSessionStorageKey(namespace: string | undefined): string {
  return namespace ? `${STORAGE_KEY}_${namespace}` : STORAGE_KEY;
}
