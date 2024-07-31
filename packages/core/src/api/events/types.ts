import type { SpanContext } from '@opentelemetry/api';

import type { TraceContext } from '../traces';

export type EventAttributes = Record<string, string>;

export interface EventEvent {
  name: string;
  timestamp: string;

  domain?: string;
  attributes?: EventAttributes;
  trace?: TraceContext;
}

export interface PushEventOptions {
  skipDedupe?: boolean;
  spanContext?: Pick<SpanContext, 'traceId' | 'spanId'>;
  /**
   * Custom timestamp in milliseconds.
   * Useful for events where the real start time happened ate a different time to when the event was pushed.
   */
  timestampOverwriteMs?: string;
}

export interface EventsAPI {
  pushEvent: (name: string, attributes?: EventAttributes, domain?: string, options?: PushEventOptions) => void;
}
