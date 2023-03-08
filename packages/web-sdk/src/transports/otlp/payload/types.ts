import type { ResourceLog } from './transform';

export interface OtelTransportPayload {
  readonly resourceLogs: Readonly<ResourceLog[]>;
  readonly resourceSpans: Readonly<unknown[]>;
}
