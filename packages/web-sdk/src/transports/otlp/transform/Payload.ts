import type { ResourceLog } from './ResourceLog';
import type { PayloadMember } from './types';

type OtelPayload = {
  resourceLogs: ResourceLog[];
  //   resourceSpans: ResourceSpan[];
};

export class Payload implements PayloadMember<OtelPayload> {
  private resLogs: ResourceLog[] = [];
  //   private resourceSpans: ResourceSpan[];

  constructor() {}

  addResourceLog(log: ResourceLog) {
    this.resLogs.push(log);
  }

  get resourceLogs() {
    return this.resLogs;
  }

  getPayloadObject() {
    return {
      resourceLogs: this.resLogs,
    } as const;
  }
}
