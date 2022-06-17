import { agent } from '../agent';
import type { Agent } from '../types';
import type { Transport, TransportItem } from './types';

export abstract class BaseTransport implements Transport {
  abstract send(item: TransportItem): void | Promise<void>;

  getIgnoreUrls(): Array<string | RegExp> {
    return [];
  }

  get agent(): Agent {
    return agent;
  }

  shutdown(): void {

  }
}
