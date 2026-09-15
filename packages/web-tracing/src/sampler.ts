import { SamplingDecision } from '@opentelemetry/sdk-trace-web';

import type { MetaSession } from '@grafana/faro-web-sdk';

export function isSessionSampled(sessionMeta: MetaSession = {}): boolean {
  return sessionMeta.attributes?.['isSampled'] === 'true';
}

export function getSamplingDecision(sessionMeta: MetaSession = {}): SamplingDecision {
  const samplingDecision = isSessionSampled(sessionMeta)
    ? SamplingDecision.RECORD_AND_SAMPLED
    : SamplingDecision.NOT_RECORD;

  return samplingDecision;
}
