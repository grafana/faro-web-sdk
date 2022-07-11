import { agent } from '../agent';
import type { Agent } from '../agent';
import type { Transport, TransportItem } from './types';

export abstract class BaseTransport implements Transport {
  get agent(): Agent {
    return agent;
  }

  abstract send(item: TransportItem): void | Promise<void>;

  getIgnoreUrls(): Array<string | RegExp> {
    return [];
  }
}
