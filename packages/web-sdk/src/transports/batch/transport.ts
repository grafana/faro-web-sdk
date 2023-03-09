import { BaseTransport, isArray, TransportItem, VERSION } from '@grafana/faro-core';

import type { BatchTransportOptions } from './types';

const DEFAULT_BATCH_SEND_TIMEOUT_MS = 250;
const DEFAULT_BATCH_SEND_COUNT = 50;

export class BatchTransport extends BaseTransport {
  readonly name = '@grafana/faro-web-sdk:transport-batch-wrapper';
  readonly version = VERSION;

  private readonly batchSendCount: number;
  private readonly batchSendTimeout: number;

  private signalBuffer: TransportItem[] = [];

  constructor(private transport: BaseTransport, options: BatchTransportOptions) {
    super();

    this.batchSendCount = options.batchSendCount ?? DEFAULT_BATCH_SEND_COUNT;
    this.batchSendTimeout = options.batchSendTimeout ?? DEFAULT_BATCH_SEND_TIMEOUT_MS;

    // Send batched/buffered data when user navigates to new page, switches or closes the tab, minimizes or closes the browser.
    // If on mobile, it also sends data if user switches from the browser to a different app.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush();
      }
    });
  }

  send(item: TransportItem | TransportItem[]): void {
    const items = isArray(item) ? item : [item];

    items.forEach((item) => {
      this.signalBuffer.push(item);

      if (this.signalBuffer.length >= this.batchSendCount) {
        this.flush();
      }
    });

    if (this.batchSendTimeout > 0) {
      window.setTimeout(() => this.flush(), this.batchSendTimeout);
    }
  }

  private flush() {
    this.transport.send(this.signalBuffer);
    this.signalBuffer = [];
  }
}
