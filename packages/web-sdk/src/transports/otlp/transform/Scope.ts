import type { PayloadMember } from './types';

export type ScopePayload = {
  name: string;
  version: string;
};

export class Scope implements PayloadMember<ScopePayload> {
  constructor() {}

  getPayloadObject(): ScopePayload {
    // The scope should originate from the instrumentation that captured this
    // For the time being we don't have this information
    // We will use the sdk as the source of information

    return {
      name: '@grafana/faro-core',
      version: '1.0.0-beta4',
    };
  }
}
