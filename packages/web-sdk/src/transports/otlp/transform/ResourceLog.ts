import type { Resource, ResourcePayload } from './Resource';
import type { PayloadMember } from './types';

export type ResourceLogPayload = {
  resource: ResourcePayload;
  scopeLogs: [];
};

export class ResourceLog implements PayloadMember<ResourceLogPayload> {
  constructor(public resource?: Resource, public scopeLog: ScopeLog) {}

  getPayloadObject(): ResourceLogPayload {
    throw new Error('Method not implemented.');
  }
}
