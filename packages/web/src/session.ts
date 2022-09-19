import type { MetaSession } from '@grafana/agent-core';
import { genShortID } from '@grafana/agent-core';

export function createSession(attributes?: MetaSession['attributes']): MetaSession {
  return {
    id: genShortID(),
    attributes,
  };
}
