import type { Event } from './event';

export interface Commands {
  pushSpan: (payload: Event) => void;
}
