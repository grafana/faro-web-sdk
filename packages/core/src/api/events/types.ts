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
}

export interface EventsAPI {
  pushEvent: (name: string, attributes?: EventAttributes, domain?: string, options?: PushEventOptions) => void;
}
