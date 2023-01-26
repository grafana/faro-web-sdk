import type { Resource, ResourcePayload } from './Resource';
import type { ScopeLog, ScopeLogPayload } from './ScopeLog';
import type { PayloadMember } from './types';

export type ResourceLogPayload = {
  resource: ResourcePayload;
  scopeLogs: ScopeLogPayload[];
};

export class ResourceLog implements PayloadMember<ResourceLogPayload> {
  private scopeLogs: ScopeLog[] = [];

  constructor(public resource: Resource, scopeLog: ScopeLog) {
    this.scopeLogs.push(scopeLog);
  }

  addScopeLog(log: ScopeLog) {
    this.scopeLogs.push(log);
  }

  getPayloadObject(): ResourceLogPayload {
    return {
      resource: this.resource?.getPayloadObject(),
      scopeLogs: this.scopeLogs.map((scopeLog) => scopeLog.getPayloadObject()),
    };
  }
}
