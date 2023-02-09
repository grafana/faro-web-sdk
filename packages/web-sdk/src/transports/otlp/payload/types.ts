import type { ResourceLogPayload } from './transform';

export interface OtelTransportPayload {
  readonly resourceLogs: Readonly<ResourceLogPayload[]>;
  readonly resourceSpans: Readonly<unknown[]>;
  readonly resourceMetrics: Readonly<unknown[]>;
}
