import type { ResourceLogs } from './transform';

export interface OtelTransportPayload {
  readonly resourceLogs: Readonly<ResourceLogs[]>;
  readonly resourceSpans: Readonly<unknown[]>;
}
