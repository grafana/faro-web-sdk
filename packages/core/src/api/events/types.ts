import type { SpanContext } from '@opentelemetry/api';

import type { TraceContext } from '../traces';
import type { UserAction } from '../types';

export type EventAttributes = Record<string, string>;

export interface EventEvent {
  name: string;
  timestamp: string;

  domain?: string;
  attributes?: EventAttributes;
  trace?: TraceContext;

  action?: UserAction;
}

export interface PushEventOptions {
  skipDedupe?: boolean;
  spanContext?: Pick<SpanContext, 'traceId' | 'spanId'>;
  timestampOverwriteMs?: number;

  /**
   * Allows manual parsing of the payload before adding it to the internal buffer.
   *
   * @param payload - The event payload to be parsed.
   * @returns The parsed event payload.
   *
   * @remarks This should be used sparingly and only in special cases where custom payload processing cannot be deferred to the before-send hook.
   */
  customPayloadParser?: (payload: EventEvent) => EventEvent;
}

export interface EventsAPI {
  pushEvent: (name: string, attributes?: EventAttributes, domain?: string, options?: PushEventOptions) => void;
}
