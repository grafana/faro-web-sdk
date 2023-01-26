import type { PayloadMember } from './types';

export type ScopePayload = {
  name: string;
  version: string;
};

export class Scope implements PayloadMember<ScopePayload> {
  // The scope should originate from the instrumentation that captured this
  // For the time being we don't have this information
  // We will use the sdk as the source of information

  private name: string;
  private version: string;

  constructor() {
    this.name = '@grafana/faro-core';
    this.version = '1.0.0-beta4';
  }

  isSameScope(scope: Scope) {
    return scope.name === this.name && scope.version === this.version;
  }

  getPayloadObject(): ScopePayload {
    return {
      name: this.name,
      version: this.version,
    };
  }
}
