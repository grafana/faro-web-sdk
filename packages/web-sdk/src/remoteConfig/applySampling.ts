import { clampSamplingRate } from '@grafana/faro-core';

/**
 * Compute a one-time sampled decision for the given rate. Mirrors `isSampled()` but takes an
 * explicit rate so the decision can be made exactly once at finalize time.
 */
export function decideSampled(sampleRate: number): boolean {
  return Math.random() < clampSamplingRate(sampleRate);
}
