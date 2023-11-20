import { faro } from '@grafana/faro-core';

export function isSampled() {
  const sendAllSignals = 1;
  const sessionTracking = faro.config.sessionTracking;
  let samplingRate = sessionTracking?.sampler?.(faro.metas.value) ?? sessionTracking?.samplingRate ?? sendAllSignals;

  if (typeof samplingRate !== 'number') {
    return false;
  }

  if (samplingRate > 1) {
    samplingRate = 1;
  }

  if (samplingRate < 0) {
    samplingRate = 0;
  }

  return Math.random() < samplingRate;
}
