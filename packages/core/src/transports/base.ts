import type { Config, Patterns } from '..';
import { BaseExtension } from '../extensions';

import type { Transport, TransportItem } from './types';

export abstract class BaseTransport<T extends Config = Config> extends BaseExtension<T> implements Transport {
  abstract send(items: TransportItem | TransportItem[]): void | Promise<void>;

  isBatched(): boolean {
    return false;
  }

  getIgnoreUrls(): Patterns {
    return [];
  }
}
