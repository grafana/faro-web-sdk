import type { Patterns } from '../config';
import { BaseTransport } from '../transports';
import type { Transport, TransportItem } from '../transports';
import { isArray } from '../utils';
import { VERSION } from '../version';

export class MockTransport extends BaseTransport implements Transport {
  readonly name = '@grafana/transport-mock';
  readonly version = VERSION;

  items: TransportItem[] = [];

  constructor(private ignoreURLs: Patterns = []) {
    super();
  }

  send(item: TransportItem | TransportItem[]): void | Promise<void> {
    const items = isArray(item) ? item : [item];
    this.items.push(...items);
  }

  override getIgnoreUrls(): Patterns {
    return this.ignoreURLs;
  }
}
