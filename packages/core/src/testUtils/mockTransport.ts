import type { Patterns } from '../config';
import { BaseTransport } from '../transports';
import type { Transport, TransportItem } from '../transports';
import { VERSION } from '../version';

export class MockTransport extends BaseTransport implements Transport {
  readonly name = '@grafana/transport-mock';
  readonly version = VERSION;

  items: TransportItem[] = [];

  constructor(private ignoreURLs: Patterns = []) {
    super();
  }

  send(items: TransportItem[]): void | Promise<void> {
    this.items.push(...items);
  }

  override isBatched(): boolean {
    return true;
  }

  override getIgnoreUrls(): Patterns {
    return this.ignoreURLs;
  }
}
