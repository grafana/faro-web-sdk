import { genShortID } from '@grafana/faro-core';
import type { MetaSession } from '@grafana/faro-core';

import { faro } from '../..';

export function createSession(attributes?: MetaSession['attributes']): MetaSession {
  return {
    id: faro.config.sessionTracking?.generateSessionId?.() ?? genShortID(),
    attributes,
  };
}
