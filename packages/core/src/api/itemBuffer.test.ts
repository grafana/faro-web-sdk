import { ItemBuffer } from './ItemBuffer';

describe('ItemBuffer', () => {
  it('Adds items to buffer', () => {
    const buffer = new ItemBuffer<number>();

    buffer.addItem(1);
    buffer.addItem(2);
    buffer.addItem(3);

    expect(buffer.size()).toBe(3);
  });

  it('Flushes buffer', () => {
    const buffer = new ItemBuffer<number>();

    buffer.addItem(1);
    buffer.addItem(2);
    buffer.addItem(3);

    expect(buffer.size()).toBe(3);

    buffer.flushBuffer();

    expect(buffer.size()).toBe(0);
  });

  it('Flushes buffer and calls callback', () => {
    const buffer = new ItemBuffer<number>();

    buffer.addItem(1);
    buffer.addItem(2);
    buffer.addItem(3);

    expect(buffer.size()).toBe(3);

    const mockCallback = jest.fn();
    buffer.flushBuffer(mockCallback);

    expect(buffer.size()).toBe(0);
    expect(mockCallback).toHaveBeenCalledTimes(3);
    expect(mockCallback).toHaveBeenNthCalledWith(1, 1);
    expect(mockCallback).toHaveBeenNthCalledWith(2, 2);
    expect(mockCallback).toHaveBeenNthCalledWith(3, 3);
  });
});
