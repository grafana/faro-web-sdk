/**
 * @jest-environment jsdom
 */
import { mockConfig, mockInternalLogger } from '../testUtils';
import { unpatchedConsole } from '../unpatchedConsole';
import { VERSION } from '../version';

import { BaseTransport } from './base';
import { TransportItemType } from './const';
import { initializeTransports } from './initialize';
import type { Transport, TransportItem } from './types';

class CollectingTransport extends BaseTransport implements Transport {
  readonly name = '@grafana/transport-collecting';
  readonly version = VERSION;

  sentItems: TransportItem[] = [];

  send(items: TransportItem | TransportItem[]): void | Promise<void> {
    const itemsArray = Array.isArray(items) ? items : [items];
    this.sentItems.push(...itemsArray);
  }
}

const generateItem = (message = 'hi'): TransportItem => ({
  type: TransportItemType.LOG,
  payload: {
    context: {},
    level: 'info' as any,
    message,
    timestamp: '2023-01-27T09:53:01.035Z',
  } as any,
  meta: {},
});

function makeTransports() {
  const transport = new CollectingTransport();
  const metas = {
    add: jest.fn(),
    remove: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    value: {},
  } as any;

  const transports = initializeTransports(
    unpatchedConsole,
    mockInternalLogger,
    mockConfig({ batching: { enabled: false }, transports: [transport] }),
    metas
  );
  transports.add(transport);

  return { transport, transports };
}

describe('transports hold buffer', () => {
  it('buffers items while holding instead of sending them', () => {
    const { transport, transports } = makeTransports();

    transports.hold();
    transports.execute(generateItem('a'));
    transports.execute(generateItem('b'));

    expect(transports.isHolding()).toBe(true);
    expect(transport.sentItems).toHaveLength(0);
  });

  it('flushHeld sends all buffered items and resumes streaming', () => {
    const { transport, transports } = makeTransports();

    transports.hold();
    transports.execute(generateItem('a'));
    transports.execute(generateItem('b'));

    transports.flushHeld();

    expect(transports.isHolding()).toBe(false);
    expect(transport.sentItems).toHaveLength(2);

    // streams normally after flush
    transports.execute(generateItem('c'));
    expect(transport.sentItems).toHaveLength(3);
  });

  it('dropHeld discards buffered items and resumes streaming', () => {
    const { transport, transports } = makeTransports();

    transports.hold();
    transports.execute(generateItem('a'));

    transports.dropHeld();

    expect(transports.isHolding()).toBe(false);
    expect(transport.sentItems).toHaveLength(0);

    transports.execute(generateItem('c'));
    expect(transport.sentItems).toHaveLength(1);
  });

  it('invokes onBufferFull once when the byte cap is exceeded', () => {
    const { transports } = makeTransports();
    const onBufferFull = jest.fn();

    // Tiny cap so a single item exceeds it.
    transports.hold({ maxBufferBytes: 10, onBufferFull });

    transports.execute(generateItem('first'));
    transports.execute(generateItem('second'));

    expect(onBufferFull).toHaveBeenCalledTimes(1);
  });

  it('hold is a no-op when already holding; flush/drop are no-ops when not holding', () => {
    const { transport, transports } = makeTransports();

    expect(() => transports.flushHeld()).not.toThrow();
    expect(() => transports.dropHeld()).not.toThrow();

    transports.hold();
    transports.hold();
    transports.execute(generateItem('a'));
    transports.flushHeld();

    expect(transport.sentItems).toHaveLength(1);
  });
});
