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
}

export interface EventsAPI {
  pushEvent: (name: string, attributes?: EventAttributes, domain?: string, options?: PushEventOptions) => void;
}
