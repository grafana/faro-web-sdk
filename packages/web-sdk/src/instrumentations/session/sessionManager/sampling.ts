import { faro } from '@grafana/faro-core';

export function isSampled() {
  const sendAllSignals = 1;
  const sessionTracking = faro.config.sessionTracking;
  let samplingRate =
    sessionTracking?.sampler?.({ metas: faro.metas.value }) ?? sessionTracking?.samplingRate ?? sendAllSignals;

  if (typeof samplingRate !== 'number') {
    return false;
  }

  return Math.random() < samplingRate;
}
