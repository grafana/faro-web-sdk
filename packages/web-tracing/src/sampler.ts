import { SamplingDecision } from '@opentelemetry/sdk-trace-web';

// eslint-disable-next-line no-restricted-imports -- Session sampling is shared through the private core coordination entry point.
import { getInternalMetas } from '@grafana/faro-core/internal';
import type { Metas, MetaSession } from '@grafana/faro-web-sdk';

export function isSessionSampled(sessionMeta: MetaSession = {}, metas?: Metas): boolean {
  const sampling = sessionMeta.id && metas ? getInternalMetas(metas).getSessionSampling(sessionMeta.id) : undefined;
  const kept = (sampling as { kept?: boolean } | undefined)?.kept;
  return kept ?? sessionMeta.attributes?.['isSampled'] === 'true';
}

export function getSamplingDecision(sessionMeta: MetaSession = {}, metas?: Metas): SamplingDecision {
  const samplingDecision = isSessionSampled(sessionMeta, metas)
    ? SamplingDecision.RECORD_AND_SAMPLED
    : SamplingDecision.NOT_RECORD;

  return samplingDecision;
}
