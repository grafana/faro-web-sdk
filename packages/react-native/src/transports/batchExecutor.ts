import { AppState } from 'react-native';

import type { TransportItem } from '@grafana/faro-core';

export type SendFn = (items: TransportItem[]) => void;

export interface BatchExecutorOptions {
  itemLimit?: number;
  sendTimeout?: number;
  paused?: boolean;
}

const DEFAULT_SEND_TIMEOUT_MS = 250;
const DEFAULT_BATCH_ITEM_LIMIT = 50;

export class RNBatchExecutor {
  private readonly itemLimit: number;
  private readonly sendTimeout: number;

  private signalBuffer: TransportItem[] = [];
  private sendFn: SendFn;
  private paused: boolean;
  private flushInterval?: ReturnType<typeof setInterval>;
  private appStateSubscription?: any;

  constructor(sendFn: SendFn, options?: BatchExecutorOptions) {
    this.itemLimit = options?.itemLimit ?? DEFAULT_BATCH_ITEM_LIMIT;
    this.sendTimeout = options?.sendTimeout ?? DEFAULT_SEND_TIMEOUT_MS;
    this.paused = options?.paused || false;
    this.sendFn = sendFn;

    if (!this.paused) {
      this.start();
    }

    // Send batched/buffered data when app goes to background
    // This is the React Native equivalent of document.visibilitychange
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        this.flush();
      }
    });
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
      // Use global setInterval (not window.setInterval)
      this.flushInterval = setInterval(() => this.flush(), this.sendTimeout);
    }
  }

  pause(): void {
    this.paused = true;
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
  }

  cleanup(): void {
    this.pause();
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
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
