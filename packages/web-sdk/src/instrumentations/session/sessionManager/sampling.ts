import { clampSamplingRate, faro } from '@grafana/faro-core';

import type { SessionContext } from './types';

export function isSampled(context: SessionContext = faro): boolean {
  const sendAllSignals = 1;
  const sessionTracking = context.config.sessionTracking;
  const rawSamplingRate =
    sessionTracking?.sampler?.({ metas: context.metas.value }) ?? sessionTracking?.samplingRate ?? sendAllSignals;
  const samplingRate = typeof rawSamplingRate === 'number' ? clampSamplingRate(rawSamplingRate) : 0;

  return Math.random() < samplingRate;
}
