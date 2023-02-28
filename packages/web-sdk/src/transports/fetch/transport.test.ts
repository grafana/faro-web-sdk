import { getTransportBody, LogEvent, LogLevel, TransportItem, TransportItemType } from '@grafana/faro-core';
import { mockInternalLogger } from '@grafana/faro-core/src/testUtils';

import { FetchTransport } from './transport';

const fetch = jest.fn(() => Promise.resolve({ status: 202 }));

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

    transport.internalLogger = mockInternalLogger;

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

    transport.internalLogger = mockInternalLogger;

    for (let idx = 0; idx < 6; idx++) {
      transport.send(item);
    }

    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('will back off on 429 for default interval if no retry-after header present', async () => {
    let now = Date.now();

    const transport = new FetchTransport({
      url: 'http://example.com/collect',
      defaultRateLimitBackoffMs: 1000,
      getNow: () => now,
    });

    transport.internalLogger = mockInternalLogger;

    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        status: 429,
        headers: {
          get: () => '',
        },
      })
    );

    await transport.send(item);
    expect(fetch).toHaveBeenCalledTimes(1);

    await transport.send(item);
    expect(fetch).toHaveBeenCalledTimes(1);

    now += 1001;
    await transport.send(item);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('will back off on 429 for default interval if retry-after header present, with delay', async () => {
    let now = Date.now();

    const transport = new FetchTransport({
      url: 'http://example.com/collect',
      defaultRateLimitBackoffMs: 1000,
      getNow: () => now,
    });

    transport.internalLogger = mockInternalLogger;

    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        status: 429,
        headers: {
          get: () => '2',
        },
      })
    );

    await transport.send(item);
    expect(fetch).toHaveBeenCalledTimes(1);

    now += 1001;
    await transport.send(item);
    expect(fetch).toHaveBeenCalledTimes(1);

    now += 1001;
    await transport.send(item);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('will back off on 429 for default interval if retry-after header present, with date', async () => {
    let now = Date.now();

    const transport = new FetchTransport({
      url: 'http://example.com/collect',
      defaultRateLimitBackoffMs: 1000,
      getNow: () => now,
    });

    transport.internalLogger = mockInternalLogger;

    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        status: 429,
        headers: {
          get: () => new Date(now + 3000).toISOString(),
        },
      })
    );

    await transport.send(item);
    expect(fetch).toHaveBeenCalledTimes(1);

    now += 1001;
    await transport.send(item);
    expect(fetch).toHaveBeenCalledTimes(1);

    now += 2001;
    await transport.send(item);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
