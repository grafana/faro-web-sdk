import { faro } from '@grafana/faro-core';

export function isSampled(): boolean {
  const sendAllSignals = 1;
  const sessionTracking = faro.config.sessionTracking;
  let samplingRate =
    sessionTracking?.sampler?.({ metas: faro.metas.value }) ?? sessionTracking?.samplingRate ?? sendAllSignals;

  if (typeof samplingRate !== 'number') {
    const sendNoSignals = 0;
    samplingRate = sendNoSignals;
  }

  return Math.random() < samplingRate;
}
