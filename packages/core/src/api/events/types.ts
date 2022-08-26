import type { TraceContext } from '../traces';

export type EventAttributes = Record<string, string>;

export interface EventEvent {
  name: string;
  timestamp: string;

  domain?: string;
  attributes?: EventAttributes;
  trace?: TraceContext;
}

export interface EventsAPI {
  pushEvent: (name: string, attributes?: EventAttributes, domain?: string) => void;
}
