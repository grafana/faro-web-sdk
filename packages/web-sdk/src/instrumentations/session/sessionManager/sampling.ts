import { clampSamplingRate, faro } from '@grafana/faro-core';

export function isSampled(): boolean {
  const sendAllSignals = 1;
  const sessionTracking = faro.config.sessionTracking;
  const rawSamplingRate =
    sessionTracking?.sampler?.({ metas: faro.metas.value }) ?? sessionTracking?.samplingRate ?? sendAllSignals;
  const samplingRate = typeof rawSamplingRate === 'number' ? clampSamplingRate(rawSamplingRate) : 0;

  if (!(samplingRate > 0)) {
    return false;
  }

  if (samplingRate === 1) {
    return true;
  }

  try {
    const crypto = typeof window !== 'undefined' ? window.crypto : undefined;
    if (typeof crypto?.getRandomValues === 'function') {
      const random = new Uint32Array(1);
      crypto.getRandomValues(random);
      return random[0]! / 2 ** 32 < samplingRate;
    }
  } catch {
    // Keep sampling available if the environment's Web Crypto implementation fails.
  }

  // Preserve fractional sampling in environments without working Web Crypto.
  return Math.random() < samplingRate;
}
