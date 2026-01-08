import { SamplingDecision } from '@opentelemetry/sdk-trace-base';

import type { MetaSession } from '@grafana/faro-core';

/**
 * Get sampling decision based on session configuration
 *
 * If the session is sampled, traces will be collected.
 * If the session is not sampled, traces will be dropped.
 *
 * @param sessionMeta - Current Faro session meta
 * @returns OTEL sampling decision
 */
export function getSamplingDecision(sessionMeta: MetaSession = {}): SamplingDecision {
  const isSessionSampled = sessionMeta.attributes?.['isSampled'] === 'true';
  const samplingDecision = isSessionSampled ? SamplingDecision.RECORD_AND_SAMPLED : SamplingDecision.NOT_RECORD;

  return samplingDecision;
}
