export function dateNow(): number {
  return Date.now();
}

/**
 * Returns a high-resolution, monotonic timestamp in milliseconds.
 *
 * Use this for measuring elapsed time / durations. Unlike {@link dateNow} (which is
 * derived from the system wall clock and is therefore subject to NTP adjustments,
 * manual clock changes, daylight-savings transitions, etc.), `monoNow` is backed by
 * `performance.now()`, which is guaranteed never to decrease and is unaffected by
 * such adjustments.
 *
 * Do NOT use this for absolute event timestamps that need to be correlated with
 * other systems or persisted across page loads — use {@link dateNow} or
 * {@link getCurrentTimestamp} for that.
 *
 * Falls back to {@link dateNow} in environments where `performance.now` is
 * unavailable (very old runtimes, unusual SSR setups). The fallback re-introduces
 * wall-clock susceptibility but preserves the API contract.
 */
export function monoNow(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

export function timestampToIsoString(value: number): string {
  return new Date(value).toISOString();
}
