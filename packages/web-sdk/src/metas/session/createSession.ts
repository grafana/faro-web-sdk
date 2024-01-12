import { faro, genShortID } from '@grafana/faro-core';
import type { MetaSession } from '@grafana/faro-core';

export function createSession(attributes?: MetaSession['attributes']): MetaSession {
  return {
    id: faro.config?.sessionTracking?.generateSessionId?.() ?? genShortID(),
    attributes,
  };
}
