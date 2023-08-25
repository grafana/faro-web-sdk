import type { ResourceLogs, ResourceSpans } from './transform';

export interface OtelTransportPayload {
  readonly resourceLogs: Readonly<ResourceLogs>;
  readonly resourceSpans: Readonly<ResourceSpans>;
}

export type Logs = Pick<OtelTransportPayload, 'resourceLogs'>;
export type Traces = Pick<OtelTransportPayload, 'resourceSpans'>;
