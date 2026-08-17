import { isFunction } from '../utils/is';

export class ItemBuffer<T> {
  private buffer: T[];

  constructor() {
    this.buffer = [];
  }

  addItem(item: T): void {
    this.buffer.push(item);
  }

  flushBuffer(cb?: (item: T) => void): void {
    if (isFunction(cb)) {
      for (const item of this.buffer) {
        cb(item);
      }
    }

    this.buffer.length = 0;
  }

  size(): number {
    return this.buffer.length;
  }
}
