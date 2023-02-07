import type { ResourceLogPayload } from './transform';

export interface OtelTransportPayload {
  readonly resourceLogs: Readonly<ResourceLogPayload[]>;
  readonly resourceSpans: Readonly<[]>;
}
