import type { LogEvent } from './api';
import { initializeGrafanaAgent } from './initialize';
import { mockConfig, MockTransport } from './testUtils';
import type { TransportItem } from './transports';

describe('agent', () => {
  it(`can be started paused and doesn't ingest events until unpaused`, () => {
    const transport = new MockTransport();
    const config = mockConfig({
      isolate: true,
      paused: true,
      transports: [transport],
    });

    const agent = initializeGrafanaAgent(config);
    agent.api.pushLog(['test']);
    expect(transport.items).toHaveLength(0);

    agent.unpause();
    agent.api.pushLog(['test2']);
    expect(transport.items).toHaveLength(1);

    const item = transport.items[0]! as TransportItem<LogEvent>;
    expect(item.payload.message).toEqual('test2');
  });

  it('can be started unpaused, then paused and unpaused again', () => {
    const transport = new MockTransport();
    const config = mockConfig({
      isolate: true,
      transports: [transport],
    });
    const agent = initializeGrafanaAgent(config);

    agent.api.pushLog(['test1']);
    expect(transport.items).toHaveLength(1);

    agent.pause();
    agent.api.pushLog(['test2']);
    expect(transport.items).toHaveLength(1);

    agent.unpause();
    agent.api.pushLog(['test3']);
    const items = transport.items as Array<TransportItem<LogEvent>>;
    expect(items[0]?.payload.message).toEqual('test1');
    expect(items[1]?.payload.message).toEqual('test3');
  });
});

export {};
