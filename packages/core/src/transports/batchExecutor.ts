import type { TransportItem } from '../';

import type { BatchExecutorOptions, SendFn } from './types';

const DEFAULT_SEND_TIMEOUT_MS = 250;
const DEFAULT_BATCH_ITEM_LIMIT = 50;

export class BatchExecutor {
  private readonly itemLimit: number;
  private readonly sendTimeout: number;

  private signalBuffer: TransportItem[] = [];
  private sendFn: SendFn;
  private paused: boolean;
  private flushInterval: number;

  constructor(sendFn: SendFn, options?: BatchExecutorOptions) {
    this.itemLimit = options?.itemLimit ?? DEFAULT_BATCH_ITEM_LIMIT;
    this.sendTimeout = options?.sendTimeout ?? DEFAULT_SEND_TIMEOUT_MS;
    this.paused = options?.paused || false;
    this.sendFn = sendFn;
    this.flushInterval = -1;

    if (!this.paused) {
      this.start();
    }

    // Send batched/buffered data when user navigates to new page, switches or closes the tab, minimizes or closes the browser.
    // If on mobile, it also sends data if user switches from the browser to a different app.
    if (!options?.ignoreBrowserApi) {
      document?.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flush();
        }
      });
    }
  }

  addItem(item: TransportItem): void {
    if (this.paused) {
      return;
    }

    this.signalBuffer.push(item);

    if (this.signalBuffer.length >= this.itemLimit) {
      this.flush();
    }
  }

  start(): void {
    this.paused = false;
    if (this.sendTimeout > 0) {
      this.flushInterval = window.setInterval(() => this.flush(), this.sendTimeout);
    }
  }

  pause(): void {
    this.paused = true;
    clearInterval(this.flushInterval);
  }

  groupItems(items: TransportItem[]): TransportItem[][] {
    const itemMap = new Map<string, TransportItem[]>();
    items.forEach((item) => {
      const metaKey = JSON.stringify(item.meta);

      let currentItems = itemMap.get(metaKey);
      if (currentItems === undefined) {
        currentItems = [item];
      } else {
        currentItems = [...currentItems, item];
      }

      itemMap.set(metaKey, currentItems);
    });
    return Array.from(itemMap.values());
  }

  private flush() {
    if (this.paused || this.signalBuffer.length === 0) {
      return;
    }

    const itemGroups = this.groupItems(this.signalBuffer);
    itemGroups.forEach(this.sendFn);
    this.signalBuffer = [];
  }
}
