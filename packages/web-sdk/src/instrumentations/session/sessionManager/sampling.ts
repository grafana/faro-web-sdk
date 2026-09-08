import { clampSamplingRate, faro } from '@grafana/faro-core';
import type { Config, Meta } from '@grafana/faro-core';

export type SamplingDecisionContext = {
  sessionTracking?: Config['sessionTracking'];
  metas?: Meta;
};

export function isSampled(context?: SamplingDecisionContext): boolean {
  const sendAllSignals = 1;
  const sessionTracking = context?.sessionTracking ?? faro.config?.sessionTracking;
  const metas = context?.metas ?? faro.metas?.value;
  const rawSamplingRate =
    sessionTracking?.sampler?.({ metas: metas ?? {} }) ?? sessionTracking?.samplingRate ?? sendAllSignals;
  const samplingRate = typeof rawSamplingRate === 'number' ? clampSamplingRate(rawSamplingRate) : 0;

  return Math.random() < samplingRate;
}
