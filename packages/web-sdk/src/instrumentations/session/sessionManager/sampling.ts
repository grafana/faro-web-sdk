import { clampSamplingRate, faro } from '@grafana/faro-core';

export function isSampled(): boolean {
  const sendAllSignals = 1;
  const sessionTracking = faro.config.sessionTracking;
  const rawSamplingRate =
    sessionTracking?.sampler?.({ metas: faro.metas.value }) ?? sessionTracking?.samplingRate ?? sendAllSignals;
  const samplingRate = typeof rawSamplingRate === 'number' ? clampSamplingRate(rawSamplingRate) : 0;

  return Math.random() < samplingRate;
}
