import type { Patterns } from '..';
import type { API } from '../api';
import { BaseExtension } from '../extensions';

import type { Transport, TransportItem } from './types';

export abstract class BaseTransport extends BaseExtension implements Transport {
  // assigned by transports.add() once the API exists; undefined for standalone transports
  api?: API;

  abstract send(items: TransportItem | TransportItem[]): void | Promise<void>;

  isBatched(): boolean {
    return false;
  }

  getIgnoreUrls(): Patterns {
    return [];
  }
}
