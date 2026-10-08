import type { LogEvent } from './api';
import { initializeFaro } from './initialize';
import { faro } from './sdk';
import { mockConfig, MockTransport } from './testUtils';
import type { TransportItem } from './transports';

describe('faro singleton before initialization', () => {
  it('exposes a no-op api that does not throw', () => {
    expect(() => faro.api.pushLog(['before init'])).not.toThrow();
    expect(faro.api.getActiveUserAction()).toBeUndefined();
    expect(faro.api.isOTELInitialized()).toBe(false);
    expect(faro.api.getSession()).toBeUndefined();
  });

  it('exposes an isolated instance when no non-isolated singleton exists', () => {
    const transport = new MockTransport();
    const isolatedFaro = initializeFaro(mockConfig({ transports: [transport] }));

    expect(faro).toBe(isolatedFaro);
    faro.api.pushLog(['isolated instance']);
    expect(transport.items).toHaveLength(1);

    const anotherIsolatedFaro = initializeFaro(mockConfig());
    expect(faro).toBe(anotherIsolatedFaro);
  });

  it('replaces the isolated export after non-isolated initialization without public exposure', () => {
    const transport = new MockTransport();

    const globalFaro = initializeFaro(
      mockConfig({
        isolate: false,
        transports: [transport],
      })
    );

    const isolatedTransport = new MockTransport();
    const isolatedFaro = initializeFaro(mockConfig({ transports: [isolatedTransport] }));

    expect(faro).toBe(globalFaro);
    faro.api.pushLog(['after init']);

    expect(transport.items).toHaveLength(1);
    expect(isolatedTransport.items).toHaveLength(0);
    const item = transport.items[0]! as TransportItem<LogEvent>;
    expect(item.payload.message).toEqual('after init');

    isolatedFaro.api.pushLog(['isolated instance']);
    expect(isolatedTransport.items).toHaveLength(1);
    expect(transport.items).toHaveLength(1);
  });
});

describe('faro', () => {
  it(`can be started paused and doesn't ingest events until unpaused`, () => {
    const transport = new MockTransport();

    const faro = initializeFaro(
      mockConfig({
        isolate: true,
        paused: true,
        transports: [transport],
      })
    );

    faro.api.pushLog(['test']);
    expect(transport.items).toHaveLength(0);

    faro.unpause();
    faro.api.pushLog(['test2']);
    expect(transport.items).toHaveLength(1);

    const item = transport.items[0]! as TransportItem<LogEvent>;
    expect(item.payload.message).toEqual('test2');
  });

  it('can be started unpaused, then paused and unpaused again', () => {
    const transport = new MockTransport();
    const faro = initializeFaro(
      mockConfig({
        isolate: true,
        transports: [transport],
      })
    );

    faro.api.pushLog(['test1']);
    expect(transport.items).toHaveLength(1);

    faro.pause();
    faro.api.pushLog(['test2']);
    expect(transport.items).toHaveLength(1);

    faro.unpause();
    faro.api.pushLog(['test3']);
    const items = transport.items as Array<TransportItem<LogEvent>>;
    expect(items[0]?.payload.message).toEqual('test1');
    expect(items[1]?.payload.message).toEqual('test3');
  });

  it('reflects the paused state in config.paused', () => {
    const faro = initializeFaro(
      mockConfig({
        isolate: true,
        transports: [new MockTransport()],
      })
    );

    expect(faro.config.paused).toBe(false);

    faro.pause();
    expect(faro.config.paused).toBe(true);
    expect(faro.transports.isPaused()).toBe(true);

    faro.unpause();
    expect(faro.config.paused).toBe(false);
    expect(faro.transports.isPaused()).toBe(false);
  });

  it('starts with config.paused set when initialized paused', () => {
    const faro = initializeFaro(
      mockConfig({
        isolate: true,
        paused: true,
        transports: [new MockTransport()],
      })
    );

    expect(faro.config.paused).toBe(true);
    expect(faro.transports.isPaused()).toBe(true);
  });
});
