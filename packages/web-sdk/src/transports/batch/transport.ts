import { BatchBaseTransport, BaseTransport, TransportItem, VERSION } from '@grafana/faro-core';

import type { BatchTransportOptions } from './types';

const DEFAULT_BATCH_SEND_TIMEOUT_MS = 250;
const DEFAULT_BATCH_SEND_COUNT = 50;

export class BatchTransport extends BaseTransport {
  readonly name = '@grafana/faro-web-sdk:transport-batch-wrapper';
  readonly version = VERSION;

  private readonly batchSendCount: number;
  private readonly batchSendTimeout: number;

  private signalCount = 0;
  private timeoutId?: number = undefined;

  private signalBuffer: TransportItem[] = [];

  constructor(private transport: BatchBaseTransport, options: BatchTransportOptions) {
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

  send(item: TransportItem): void {
    clearTimeout(this.timeoutId);

    this.signalBuffer.push(item);
    this.signalCount++;

    if (this.signalCount >= this.batchSendCount) {
      console.log('count', this.signalCount, this.batchSendCount);

      this.flush();
      return;
    }

    this.timeoutId = window.setTimeout(() => this.flush(), this.batchSendTimeout);
  }

  private flush() {
    this.transport.sendBatch(this.signalBuffer);
    this.signalCount = 0;
    this.signalBuffer = [];
  }
}
