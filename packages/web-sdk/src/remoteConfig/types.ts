/**
 * The remote-config schema version. Bumping this invalidates all cached configs.
 */
export const REMOTE_CONFIG_SCHEMA_VERSION = '1';

/**
 * Response DTO returned by the collector's `GET /config/{appKey}` endpoint.
 * `sampleRate` is omitted when unset.
 */
export interface RemoteConfigResponse {
  sampleRate?: number;
  version: string;
}

/**
 * The shape persisted in `localStorage`. Holds the resolved response.
 */
export interface CachedRemoteConfig {
  config: RemoteConfigResponse;
}
