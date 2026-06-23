import { clampSamplingRate } from '@grafana/faro-core';
import type { Config, InternalLogger } from '@grafana/faro-core';

import type { RemoteConfigOptions } from '../config';
import {
  getSessionManagerByConfig,
  isSampled,
  markSessionNotSampled,
} from '../instrumentations/session/sessionManager';

import { readCachedConfig, writeCachedConfig } from './cache';
import { buildConfigUrl, extractAppKey, fetchRemoteConfig } from './fetcher';

export const DEFAULT_TIMEOUT_MS = 1500;
export const DEFAULT_MAX_BUFFER_BYTES = 64 * 1024;

/**
 * Minimal surface of the registered Faro instance the deferred lifecycle needs. Kept narrow to
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
 * Result of the synchronous pre-init phase.
 *
 * - `mode === 'disabled'`: remote sampling does not apply (a local custom sampler wins, or the config
 *   URL could not be resolved). The lifecycle is a no-op.
 * - `mode === 'deferred'`: every new session holds telemetry and consults the LIVE remote rate before
 *   its sampling decision is finalized. The caller must invoke {@link engageRemoteConfig} after Faro
 *   is initialized to engage the hold + conditional fetch. This is the single path for BOTH a cold
 *   cache (no prior entry) and a warm cache (prior entry exists) — the warm rate is only a fallback,
 *   never applied instantly, so an operator's live change is reliably reflected.
 */
export interface PreInitResult {
  mode: 'disabled' | 'deferred';
  appKey?: string;
  /**
   * Cache discriminator used to scope `localStorage` reads/writes. Resolves to the extracted app key
   * when available, otherwise to the app ID (`config.app?.name`). It is NEVER the `configEndpoint`
   * URL — that is a manual fetch target and must not become a cache key. When neither an app key nor
   * an app ID is available, this is `undefined` and all cache operations are skipped (no-ops), so the
   * lifecycle still runs but never reads/writes a missing or colliding key.
   */
  cacheId?: string;
  configUrl?: string;
  timeoutMs: number;
  maxBufferBytes: number;
  /**
   * The rate to fall back to when the fetch does not yield a fresh rate (timeout or error). It
   * is the cached `sampleRate` when a cache entry exists, otherwise the local/bundled `samplingRate`
   * captured before it was overridden to keep-all (`1`) for the hold window. `finalize` uses this so a
   * fetch failure honors the cache/local rate (not the temporary keep-all `1`).
   */
  fallbackRate?: number;
}

interface PrepareParams {
  config: Config;
  collectorUrl: string | undefined;
  options: RemoteConfigOptions;
  internalLogger: InternalLogger;
}

/**
 * Synchronous pre-init phase. Resolves the app key + config URL, reads the cache for a fallback rate,
 * and unconditionally arms the deferred hold.
 *
 * - A local custom `sampler` wins over the remote rate (documented escape hatch) → `disabled`.
 * - The config URL cannot be resolved → `disabled`.
 * - Otherwise → `deferred`. We ALWAYS force keep-all (`config.sessionTracking.samplingRate = 1`)
 *   before init so the session is created with `isSampled='true'` and its before-send hook never
 *   pre-drops, and we stash a `fallbackRate` (cached rate when present, else the original local/bundled
 *   rate). The single source of truth for the current session becomes the decision made in `finalize`,
 *   which always consults the LIVE remote rate. A warm cache no longer applies its rate instantly —
 *   under this model the cache only feeds the fetch-failure fallback.
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

    const appKey = extractAppKey(collectorUrl) ?? undefined;

    // Resolve the config URL. An explicit `configEndpoint` wins and is used verbatim (no app key
    // required). Otherwise we need a resolvable app key to derive the Grafana `/config/{appKey}` URL.
    const configUrl =
      options.configEndpoint ?? (appKey != null ? buildConfigUrl(appKey, collectorUrl, options.url) : null);

    if (configUrl == null) {
      internalLogger.debug('Remote config: could not resolve config URL, using bundled default');
      return disabled;
    }

    // Cache discriminator: the app key when present, else the app ID (`config.app?.name`). The
    // `configEndpoint` URL is a manual fetch target and must NEVER be used as a cache key. When
    // neither is available `cacheId` is undefined and all cache operations are skipped — the
    // lifecycle still runs, but with no localStorage reads/writes.
    const cacheId = appKey ?? config.app?.name;

    // Read the cache for a fallback rate. The cached rate is NOT applied to the live config —
    // it only serves the fetch-failure fallback.
    const cached = cacheId != null ? readCachedConfig(cacheId, internalLogger) : null;

    // Fallback rate: the cached rate when a cache entry exists, else the local/bundled rate captured
    // before we override it. `finalize` falls back to this on a timeout/error.
    const originalSamplingRate = config.sessionTracking?.samplingRate;
    const fallbackRate = cached?.config.sampleRate ?? originalSamplingRate;

    // Unify warm + cold into a single deferred path: force keep-all (`1`) before init so the session
    // is created with `isSampled='true'` and never pre-drops. The remote decision in `finalize` is the
    // single source of truth, and it always consults the LIVE rate (so a stale warm rate cannot leak
    // through). The cached rate, if any, survives as `fallbackRate`.
    if (config.sessionTracking) {
      config.sessionTracking.samplingRate = 1;
    }

    return {
      mode: 'deferred',
      appKey,
      cacheId,
      configUrl,
      timeoutMs,
      maxBufferBytes,
      fallbackRate,
    };
  } catch (err) {
    internalLogger.debug('Remote config: unexpected error during preparation\n', err);
    return disabled;
  }
}

/**
 * Post-init phase. Drives the unified defer-and-buffer lifecycle for every session: hold outgoing
 * telemetry, fetch the live rate, and finalize the sampling decision exactly once.
 *
 * - `updated` (200) → write the fresh config to the cache + finalize against the FETCHED rate. A
 *   changed rate fetched here overrides any cached/local rate for the current session.
 * - timeout/error → finalize against the fallback rate (cached, else local/bundled).
 *
 * A one-shot unload listener finalizes immediately against the fallback rate (flushing the held
 * buffer) so a visitor who leaves during the hold window does not lose buffered telemetry.
 *
 * Synchronous: never awaits. Never throws.
 */
export function engageRemoteConfig(faro: RemoteConfigFaro, prep: PreInitResult): void {
  const { internalLogger } = faro;

  try {
    // Note: a missing `cacheId` is NOT a reason to bail — the no-identity configEndpoint path runs
    // the full lifecycle, it just skips localStorage caching. Only `configUrl` is required.
    if (prep.mode === 'disabled' || prep.configUrl == null) {
      return;
    }

    // The local rate was stashed in `prep.fallbackRate` and the live config was forced to keep-all
    // (`1`) before init, so the current session is keep-all and `finalize` is the single source of
    // truth for its sampling decision.
    let finalized = false;
    const fallbackRate = prep.fallbackRate;
    let removeUnloadListener: (() => void) | undefined;

    const finalizeOnce = (sampleRate: number | undefined, sampledOverride?: boolean) => {
      if (finalized) {
        return;
      }

      finalized = true;
      // Always remove the unload listener once the decision is made so it cannot fire after finalize
      // and cannot leak across the page's lifetime.
      removeUnloadListener?.();
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

    // Finalize-on-unload: if the visitor leaves while we are still holding, finalize immediately
    // against the fallback rate and flush the held buffer so buffered telemetry is not lost. Covers
    // the whole hold lifecycle. Guarded for non-browser/no-document environments.
    removeUnloadListener = registerFinalizeOnUnload(() => {
      internalLogger.debug('Remote config: page hidden while holding, finalizing against fallback');
      // Flush (keep) on unload so the visitor's buffered telemetry survives the hold window.
      finalizeOnce(fallbackRate, true);
    });

    fetchRemoteConfig(prep.configUrl, prep.timeoutMs, internalLogger)
      .then((result) => {
        if (result.kind === 'updated') {
          // Skip the write entirely when there is no cacheId (no-identity configEndpoint path).
          if (prep.cacheId != null) {
            writeCachedConfig(prep.cacheId, result.value, internalLogger);
          }
          // A freshly fetched rate overrides any cached/local rate for the current session.
          finalizeOnce(result.value.config.sampleRate);
          return;
        }

        // Any non-update (`error`, timeout) falls back to the cached/local rate.
        finalizeOnce(fallbackRate);
      })
      .catch((err) => {
        // fetchRemoteConfig never rejects, but guard anyway so we never leave the buffer held.
        internalLogger.debug('Remote config: fetch unexpectedly rejected\n', err);
        finalizeOnce(fallbackRate);
      });
  } catch (err) {
    internalLogger.debug('Remote config: unexpected error while engaging lifecycle\n', err);
    if (faro.transports.isHolding()) {
      faro.transports.flushHeld();
    }
  }
}

/**
 * Register a one-shot listener that finalizes the hold when the page is being unloaded. Listens for
 * `visibilitychange` → hidden and `pagehide` (the reliable mobile/bfcache signals), invokes the
 * callback once, and removes BOTH listeners immediately so nothing leaks and the callback never fires
 * twice. Returns a disposer the caller invokes on a normal finalize so the listeners are always
 * removed exactly once.
 *
 * Guards for non-browser / no-document environments by returning a no-op disposer.
 */
function registerFinalizeOnUnload(onUnload: () => void): () => void {
  if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') {
    return () => {};
  }

  let removed = false;

  const remove = () => {
    if (removed) {
      return;
    }
    removed = true;
    document.removeEventListener('visibilitychange', onVisibilityChange);
    document.removeEventListener('pagehide', onPageHide);
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      remove();
      onUnload();
    }
  };

  const onPageHide = () => {
    remove();
    onUnload();
  };

  document.addEventListener('visibilitychange', onVisibilityChange);
  document.addEventListener('pagehide', onPageHide);

  return remove;
}

/**
 * Finalize the sampling decision exactly once. This is the single source of truth for the current
 * session's sampling decision:
 * - resolve the effective rate as the provided rate (fetched or fallback) ?? keep-all,
 * - apply it to the live config so any subsequent *new* session uses it (the live config currently
 *   holds the temporary keep-all `1` set before init),
 * - decide sampled-or-not once for the current session,
 * - if sampled: flush the held buffer (the keep-all session lets post-finalize items stream),
 * - if not sampled: drop the held buffer AND flip the current session to `isSampled='false'` in
 *   place so the existing session before-send hook drops all post-finalize items too — without
 *   creating a new session id or re-deriving the decision probabilistically.
 *
 * `sampledOverride` forces the decision (used by the buffer-cap path: keep, and the unload path: keep).
 */
function finalize(
  faro: RemoteConfigFaro,
  sampleRate: number | undefined,
  fallbackRate: number | undefined,
  sampledOverride?: boolean
): void {
  // Effective rate: the resolved (fetched or fallback) rate, else the fallback rate, else keep-all.
  // Never read the live config here — it was forced to `1` before init for the hold window.
  const effectiveRate = clampSamplingRate(sampleRate ?? fallbackRate ?? 1);

  if (faro.config.sessionTracking) {
    faro.config.sessionTracking.samplingRate = effectiveRate;
  }

  if (!faro.transports.isHolding()) {
    return;
  }

  const sampled = sampledOverride ?? isSampled(effectiveRate);

  if (sampled) {
    faro.transports.flushHeld();
  } else {
    faro.transports.dropHeld();
    // The session was created keep-all; flip it so post-finalize streaming is suppressed too.
    markSessionNotSampled(getSessionManagerByConfig(faro.config.sessionTracking));
  }
}
