import type { MetaSession } from '@grafana/agent-core';
import ShortUniqueId from 'short-unique-id';

const uid = new ShortUniqueId({ length: 10 });

export function createSession(attributes?: MetaSession['attributes']): MetaSession {
  return {
    id: uid.randomUUID(),
    attributes,
  };
}
