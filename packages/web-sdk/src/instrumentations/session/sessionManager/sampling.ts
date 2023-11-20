import { faro } from '@grafana/faro-core';

export function isSampled() {
  const sessionTracking = faro.config.sessionTracking;
  const samplingRate = sessionTracking?.sampler?.(faro.metas.value) ?? sessionTracking?.samplingRate;

  if (typeof samplingRate !== 'number') {
    return false;
  }

  return Math.random() < samplingRate;
}
