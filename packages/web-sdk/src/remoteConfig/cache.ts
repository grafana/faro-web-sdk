import type { InternalLogger } from '@grafana/faro-core';

import { getItem, setItem, webStorageType } from '../utils/webStorage';

import { isValidRemoteConfig } from './fetcher';
import { REMOTE_CONFIG_SCHEMA_VERSION } from './types';
import type { CachedRemoteConfig } from './types';

/**
 * Build the `localStorage` cache key for an app, scoped by schema version so a version bump
 * invalidates all previously cached configs.
 */
export function getCacheKey(appKey: string): string {
  return `faro_remote_config_v${REMOTE_CONFIG_SCHEMA_VERSION}_${appKey}`;
}

/**
 * Read the cached config for an app synchronously. Returns `null` on a cold cache, malformed
 * payload, or a payload whose schema version does not match the current one.
 */
export function readCachedConfig(appKey: string, internalLogger: InternalLogger): CachedRemoteConfig | null {
  try {
    const raw = getItem(getCacheKey(appKey), webStorageType.local);

    if (raw == null) {
      return null;
    }

    const parsed = JSON.parse(raw) as CachedRemoteConfig;

    if (!parsed?.config || !isValidRemoteConfig(parsed.config)) {
      return null;
    }

    if (parsed.config.version !== REMOTE_CONFIG_SCHEMA_VERSION) {
      return null;
    }

    return parsed;
  } catch (err) {
    internalLogger.debug('Failed to read cached remote config\n', err);
    return null;
  }
}

/**
 * Persist the resolved config (and its `ETag`) for the next page load.
 */
export function writeCachedConfig(appKey: string, value: CachedRemoteConfig, internalLogger: InternalLogger): void {
  try {
    setItem(getCacheKey(appKey), JSON.stringify(value), webStorageType.local);
  } catch (err) {
    internalLogger.debug('Failed to write cached remote config\n', err);
  }
}
