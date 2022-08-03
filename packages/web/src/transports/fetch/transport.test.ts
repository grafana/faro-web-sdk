import { LogEvent, LogLevel, TransportItem, TransportItemType, getTransportBody } from '@grafana/agent-core';

import { FetchTransport } from './transport';

const fetch = jest.fn(() => setImmediate(() => Promise.resolve({})));

(global as any).fetch = fetch;

const item: TransportItem<LogEvent> = {
  type: TransportItemType.LOG,
  payload: {
    context: {},
    level: LogLevel.INFO,
    message: 'hi',
    timestamp: new Date().toISOString(),
  },
  meta: {},
};

describe('FetchTransport', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('will send event over fetch', () => {
    const transport = new FetchTransport({
      url: 'http://example.com/collect',
    });

    transport.send(item);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('http://example.com/collect', {
      body: JSON.stringify(getTransportBody(item)),
      headers: {
        'Content-Type': 'application/json',
      },
      keepalive: true,
      method: 'POST',
    });
  });

  it('will not sending events if buffer size is exhausted', () => {
    const transport = new FetchTransport({
      url: 'http://example.com/collect',
      bufferSize: 3,
    });

    for (let i = 0; i < 6; i++) {
      transport.send(item);
    }
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});

export {};
