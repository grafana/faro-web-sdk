import { BaseExtension } from '../extensions';

import type { BatchTransport, TransportItem } from './types';

export abstract class BatchBaseTransport extends BaseExtension implements BatchTransport {
  abstract sendBatch(items: TransportItem[]): void | Promise<void>;

  getIgnoreUrls(): Array<string | RegExp> {
    return [];
  }
}
