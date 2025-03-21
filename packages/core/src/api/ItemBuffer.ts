import { isFunction } from '../utils/is';

export class ItemBuffer<T> {
  private buffer: T[];

  constructor() {
    this.buffer = [];
  }

  addItem(item: T) {
    this.buffer.push(item);
  }

  flushBuffer(cb?: (item: T) => void) {
    if (isFunction(cb)) {
      for (const item of this.buffer) {
        cb(item);
      }
    }

    this.buffer.length = 0;
  }

  size() {
    return this.buffer.length;
  }
}
