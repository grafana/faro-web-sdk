import type { Event } from './event';

export interface Commands {
  pushMeasurement: (payload: Event) => void;
}
