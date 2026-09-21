import { clampSamplingRate, faro } from '@grafana/faro-core';
import type { Config, Meta } from '@grafana/faro-core';

export function isSampled(
  sessionTracking: Config['sessionTracking'] = faro.config.sessionTracking,
  metas: Meta = faro.metas.value
): boolean {
  const sendAllSignals = 1;
  const rawSamplingRate = sessionTracking?.sampler?.({ metas }) ?? sessionTracking?.samplingRate ?? sendAllSignals;
  const samplingRate = typeof rawSamplingRate === 'number' ? clampSamplingRate(rawSamplingRate) : 0;

  return Math.random() < samplingRate;
}
