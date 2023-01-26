// Contains all the resource* Items i. e. resourceLop and resourceSpans for traces

import type { ResourceLog } from './ResourceLog';
import type { PayloadMember } from './types';

type OtelPayload = {
  resourceLogs: ResourceLog[];
  //   resourceSpans: ResourceSpan[];
};

export class Payload implements PayloadMember<OtelPayload> {
  private resourceLogs: ResourceLog[] = [];
  //   private resourceSpans: ResourceSpan[];

  constructor() {}

  addResourceLog(log: ResourceLog) {
    this.resourceLogs.push(log);
  }

  getPayloadObject() {
    return {
      resourceLogs: this.resourceLogs,
    };
  }
}
