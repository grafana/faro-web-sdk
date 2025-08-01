import { SamplingDecision } from '@opentelemetry/sdk-trace-web';

import type { MetaSession } from '@grafana/react-native-sdk';

export function getSamplingDecision(sessionMeta: MetaSession = {}): SamplingDecision {
  const isSessionSampled = sessionMeta.attributes?.['isSampled'] === 'true';
  const samplingDecision = isSessionSampled ? SamplingDecision.RECORD_AND_SAMPLED : SamplingDecision.NOT_RECORD;

  return samplingDecision;
}
