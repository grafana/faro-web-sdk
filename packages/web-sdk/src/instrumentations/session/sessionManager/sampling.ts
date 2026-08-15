import { clampSamplingRate, faro } from '@grafana/faro-core';
import type { Config, Metas } from '@grafana/faro-core';

type IsSampledParams = {
  config?: Config;
  metas?: Metas;
};

// Read the sampling settings from the owning instance's config/metas when provided, so
// co-located instances don't use each other's sampling decision. Falls back to the global
// faro object for backwards compatibility with zero-arg callers.
export function isSampled({ config, metas }: IsSampledParams = {}): boolean {
  const sendAllSignals = 1;
  const sessionTracking = (config ?? faro.config).sessionTracking;
  const metasValue = (metas ?? faro.metas).value;
  const rawSamplingRate =
    sessionTracking?.sampler?.({ metas: metasValue }) ?? sessionTracking?.samplingRate ?? sendAllSignals;
  const samplingRate = typeof rawSamplingRate === 'number' ? clampSamplingRate(rawSamplingRate) : 0;

  return Math.random() < samplingRate;
}
