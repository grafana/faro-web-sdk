import { clampSamplingRate } from '@grafana/faro-core';
import type { Config, InternalLogger } from '@grafana/faro-core';

import type { RemoteConfigOptions } from '../config';
import { getSessionManagerByConfig, markSessionNotSampled } from '../instrumentations/session/sessionManager';

import { decideSampled } from './applySampling';
import { readCachedConfig, writeCachedConfig } from './cache';
import { buildConfigUrl, extractAppKey, fetchRemoteConfig } from './fetcher';

export const DEFAULT_TIMEOUT_MS = 1500;
export const DEFAULT_MAX_BUFFER_BYTES = 64 * 1024;

/**
 * Minimal surface of the registered Faro instance the cold-cache lifecycle needs. Kept narrow to
 * avoid a hard dependency on the full `Faro` type and to ease testing.
 */
export interface RemoteConfigFaro {
  config: Config;
  transports: {
    hold: (options?: { maxBufferBytes?: number; onBufferFull?: () => void }) => void;
    flushHeld: () => void;
    dropHeld: () => void;
    isHolding: () => boolean;
  };
  internalLogger: InternalLogger;
}

/**
 * Result of the synchronous pre-init phase. When `mode === 'cold'`, the caller must invoke
 * {@link startColdLifecycle} after Faro is initialized to engage the hold + fetch.
 */
export interface PreInitResult {
  mode: 'disabled' | 'warm' | 'cold';
  appKey?: string;
  configUrl?: string;
  timeoutMs: number;
  maxBufferBytes: number;
  cachedEtag?: string;
  /**
   * Cold path only: the local/bundled `samplingRate` captured before it was overridden to `1` for
   * the keep-all hold window. `finalize` falls back to this when the fetch does not yield a rate, so
   * a fetch failure honors the local rate (not the temporary keep-all `1`).
   */
  originalSamplingRate?: number;
}

interface PrepareParams {
  config: Config;
  collectorUrl: string | undefined;
  options: RemoteConfigOptions;
  internalLogger: InternalLogger;
}

/**
 * Synchronous pre-init phase. Resolves the app key + config URL and reads the cache.
 *
 * - A local custom `sampler` wins over the remote rate (documented escape hatch) → `disabled`.
 * - Warm cache → applies the cached rate to `config.sessionTracking.samplingRate` immediately
 *   (before the session decision is made by the session instrumentation) and returns `warm`.
 * - Cold cache → returns `cold`; the caller engages the hold lifecycle after init.
 *
 * Never throws.
 */
export function prepareRemoteConfig({ config, collectorUrl, options, internalLogger }: PrepareParams): PreInitResult {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBufferBytes = options.maxBufferBytes ?? DEFAULT_MAX_BUFFER_BYTES;
  const disabled: PreInitResult = { mode: 'disabled', timeoutMs, maxBufferBytes };

  try {
    if (typeof config.sessionTracking?.sampler === 'function') {
      internalLogger.debug('Remote config: local sampler present, skipping remote sampling');
      return disabled;
    }

    const appKey = extractAppKey(collectorUrl);

    if (appKey == null) {
      internalLogger.debug('Remote config: could not resolve app key, using bundled default');
      return disabled;
    }

    const configUrl = buildConfigUrl(appKey, collectorUrl, options.url);

    if (configUrl == null) {
      internalLogger.debug('Remote config: could not resolve config URL, using bundled default');
      return disabled;
    }

    const cached = readCachedConfig(appKey, internalLogger);

    if (cached != null) {
      // Warm cache: apply the rate now so the session instrumentation samples with it. No buffering.
      if (cached.config.sampleRate !== undefined && config.sessionTracking) {
        config.sessionTracking.samplingRate = clampSamplingRate(cached.config.sampleRate);
      }

      return { mode: 'warm', appKey, configUrl, timeoutMs, maxBufferBytes, cachedEtag: cached.etag };
    }

    // Cold cache: we have no rate yet, so we cannot let the session instrumentation make a sampling
    // decision against the *local* rate now — that would gate the current session by both the local
    // roll (via the session before-send hook) and the later remote roll (at finalize), and a remote
    // rate could never override a local one. Instead, stash the local rate and force keep-all (`1`)
    // before init so the session is created with `isSampled='true'` and its before-send hook never
    // pre-drops. The single source of truth becomes the remote decision made in `finalize`.
    const originalSamplingRate = config.sessionTracking?.samplingRate;

    if (config.sessionTracking) {
      config.sessionTracking.samplingRate = 1;
    }

    return { mode: 'cold', appKey, configUrl, timeoutMs, maxBufferBytes, originalSamplingRate };
  } catch (err) {
    internalLogger.debug('Remote config: unexpected error during preparation\n', err);
    return disabled;
  }
}

/**
 * Post-init phase. Drives the defer-and-buffer lifecycle for a cold cache, and triggers background
 * revalidation for a warm cache. Synchronous: never awaits. Never throws.
 */
export function engageRemoteConfig(faro: RemoteConfigFaro, prep: PreInitResult): void {
  const { internalLogger } = faro;

  try {
    if (prep.mode === 'disabled' || prep.appKey == null || prep.configUrl == null) {
      return;
    }

    if (prep.mode === 'warm') {
      // Revalidate in the background so the cache is fresh for the next load.
      backgroundRevalidate(faro, prep.appKey, prep.configUrl, prep.timeoutMs, prep.cachedEtag);
      return;
    }

    // Cold cache: hold outgoing telemetry while we resolve the rate, bounding memory by a byte cap.
    // The local rate was stashed in `prep.originalSamplingRate` and the live config was forced to
    // keep-all (`1`) before init, so the current session is keep-all and `finalize` is the single
    // source of truth for its sampling decision.
    let finalized = false;
    const fallbackRate = prep.originalSamplingRate;

    const finalizeOnce = (sampleRate: number | undefined, sampledOverride?: boolean) => {
      if (finalized) {
        return;
      }

      finalized = true;
      finalize(faro, sampleRate, fallbackRate, sampledOverride);
    };

    faro.transports.hold({
      maxBufferBytes: prep.maxBufferBytes,
      onBufferFull: () => {
        // Buffer cap hit before the fetch resolved: finalize early as "sampled" (keep) + flush.
        internalLogger.debug('Remote config: buffer cap reached, finalizing as sampled');
        finalizeOnce(undefined, true);
      },
    });

    fetchRemoteConfig(prep.configUrl, prep.timeoutMs, internalLogger)
      .then((result) => {
        if (result.kind === 'updated') {
          writeCachedConfig(prep.appKey!, result.value, internalLogger);
          finalizeOnce(result.value.config.sampleRate);
          return;
        }

        // Any non-update falls back to the stashed local/bundled rate. This includes an unexpected
        // 304 (`not-modified`): the cold path sends no `If-None-Match`, so a 304 is anomalous — we
        // still finalize against the local rate rather than leaving the app permanently held.
        finalizeOnce(undefined);
      })
      .catch((err) => {
        // fetchRemoteConfig never rejects, but guard anyway so we never leave the buffer held.
        internalLogger.debug('Remote config: fetch unexpectedly rejected\n', err);
        finalizeOnce(undefined);
      });
  } catch (err) {
    internalLogger.debug('Remote config: unexpected error while engaging lifecycle\n', err);
    if (faro.transports.isHolding()) {
      faro.transports.flushHeld();
    }
  }
}

/**
 * Finalize the cold-cache sampling decision exactly once. This is the single source of truth for
 * the current session's sampling decision on the cold path:
 * - resolve the effective rate as remote rate ?? stashed local/bundled rate ?? keep-all,
 * - apply it to the live config so any subsequent *new* session uses it (the live config currently
 *   holds the temporary keep-all `1` set before init),
 * - decide sampled-or-not once for the current session,
 * - if sampled: flush the held buffer (the keep-all session lets post-finalize items stream),
 * - if not sampled: drop the held buffer AND flip the current session to `isSampled='false'` in
 *   place so the existing session before-send hook drops all post-finalize items too — without
 *   creating a new session id or re-deriving the decision probabilistically.
 *
 * `sampledOverride` forces the decision (used by the buffer-cap path: keep).
 */
function finalize(
  faro: RemoteConfigFaro,
  sampleRate: number | undefined,
  fallbackRate: number | undefined,
  sampledOverride?: boolean
): void {
  // Effective rate: remote wins, else the stashed local/bundled rate, else keep-all. Never read the
  // live config here — it was forced to `1` before init for the hold window.
  const effectiveRate = clampSamplingRate(sampleRate ?? fallbackRate ?? 1);

  if (faro.config.sessionTracking) {
    faro.config.sessionTracking.samplingRate = effectiveRate;
  }

  if (!faro.transports.isHolding()) {
    return;
  }

  const sampled = sampledOverride ?? decideSampled(effectiveRate);

  if (sampled) {
    faro.transports.flushHeld();
  } else {
    faro.transports.dropHeld();
    // The session was created keep-all; flip it so post-finalize streaming is suppressed too.
    markSessionNotSampled(getSessionManagerByConfig(faro.config.sessionTracking));
  }
}

/**
 * Conditionally revalidate the cached config in the background and update the cache for the next
 * load. Does not affect the current session.
 */
function backgroundRevalidate(
  faro: RemoteConfigFaro,
  appKey: string,
  configUrl: string,
  timeoutMs: number,
  etag?: string
): void {
  const { internalLogger } = faro;

  fetchRemoteConfig(configUrl, timeoutMs, internalLogger, etag)
    .then((result) => {
      if (result.kind === 'updated') {
        writeCachedConfig(appKey, result.value, internalLogger);
      }
    })
    .catch((err) => {
      internalLogger.debug('Remote config: background revalidation failed\n', err);
    });
}
