import { BaseExtension } from '../extensions';

import type { Transport, TransportItem } from './types';

export abstract class BaseTransport extends BaseExtension implements Transport {
  abstract send(items: TransportItem | TransportItem[]): void | Promise<void>;

  isBatched(): boolean {
    this.internalLogger.warn(
      `Custom transports supporting a single TransportItem are deprecated. You should change your transport to accomondate an array of TransportItem. You can read how to upgrade your transports in the README.`
    );
    return false;
  }

  getIgnoreUrls(): Array<string | RegExp> {
    return [];
  }
}
