import type { InternalLogger } from '@grafana/faro-core';

import { REMOTE_CONFIG_SCHEMA_VERSION } from './types';
import type { CachedRemoteConfig, RemoteConfigResponse } from './types';

/**
 * Outcome of a remote-config fetch.
 * - `updated`: the endpoint returned a fresh config (200).
 * - `error`: anything went wrong (network, timeout, parse, non-2xx). The caller falls back to
 *   the cached/bundled default; the SDK never throws out of init.
 */
export type FetchResult = { kind: 'updated'; value: CachedRemoteConfig } | { kind: 'error' };

/**
 * Validate the response DTO. `sampleRate`, when present, must be a finite number in `[0, 1]`.
 */
export function isValidRemoteConfig(value: unknown): value is RemoteConfigResponse {
  if (typeof value !== 'object' || value == null) {
    return false;
  }

  const config = value as Partial<RemoteConfigResponse>;

  if (typeof config.version !== 'string') {
    return false;
  }

  if (config.sampleRate !== undefined) {
    if (typeof config.sampleRate !== 'number' || !isFinite(config.sampleRate)) {
      return false;
    }

    if (config.sampleRate < 0 || config.sampleRate > 1) {
      return false;
    }
  }

  return true;
}

/**
 * Extract the app key from a collector URL of the form `https://host/collect/{appKey}`.
 * Returns `null` when no key segment is present.
 */
export function extractAppKey(collectorUrl: string | undefined): string | null {
  if (!collectorUrl) {
    return null;
  }

  const match = collectorUrl.match(/\/collect\/([^/?#]+)/);
  return match?.[1] ?? null;
}

/**
 * Build the config URL. When an explicit base `url` is provided, requests `${url}/config/${appKey}`.
 * Otherwise derives it from the collector URL by swapping the `/collect[/{key}]` suffix for
 * `/config/{appKey}`.
 */
export function buildConfigUrl(appKey: string, collectorUrl: string | undefined, baseUrl?: string): string | null {
  if (baseUrl) {
    return `${baseUrl.replace(/\/$/, '')}/config/${appKey}`;
  }

  if (collectorUrl) {
    const swapped = collectorUrl.replace(/\/collect(?:\/[^/?#]*)?(?=$|[?#])/, `/config/${appKey}`);

    if (swapped !== collectorUrl) {
      return swapped;
    }
  }

  return null;
}

/**
 * Fetch the remote config with a hard timeout. Never throws — all failures resolve to
 * `{ kind: 'error' }`.
 */
export async function fetchRemoteConfig(
  url: string,
  timeoutMs: number,
  internalLogger: InternalLogger
): Promise<FetchResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    if (!response.ok) {
      internalLogger.debug(`Remote config fetch returned non-ok status ${response.status}`);
      return { kind: 'error' };
    }

    const body = (await response.json()) as unknown;

    if (!isValidRemoteConfig(body)) {
      internalLogger.debug('Remote config response failed validation\n', body);
      return { kind: 'error' };
    }

    if (body.version !== REMOTE_CONFIG_SCHEMA_VERSION) {
      internalLogger.debug(`Remote config schema version mismatch: ${body.version}`);
      return { kind: 'error' };
    }

    return {
      kind: 'updated',
      value: {
        config: body,
      },
    };
  } catch (err) {
    internalLogger.debug('Remote config fetch failed\n', err);
    return { kind: 'error' };
  } finally {
    clearTimeout(timeoutId);
  }
}
