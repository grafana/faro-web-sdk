import { BaseExtension } from '../extensions';

import type { Transport, TransportItem } from './types';

export abstract class BaseTransport extends BaseExtension implements Transport {
  abstract send(item: TransportItem): void | Promise<void>;

  getIgnoreUrls(): Array<string | RegExp> {
    return [];
  }
}
