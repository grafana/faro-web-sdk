import {
  getTransportBody,
  initializeFaro,
  LogEvent,
  LogLevel,
  TransportItem,
  TransportItemType,
} from '@grafana/faro-core';
import { mockConfig, mockInternalLogger } from '@grafana/faro-core/src/testUtils';

import * as sessionManagerUtilsMock from '../../instrumentations/session/sessionManager/sessionManagerUtils';

import { FetchTransport } from './transport';

const fetch = jest.fn(() =>
  Promise.resolve({
    status: 202,
    headers: {
      get: (_name: string): string | undefined => undefined,
    },
    text: () => Promise.resolve(),
  })
);

(global as any).fetch = fetch;

const mockSessionId = '123';

const item: TransportItem<LogEvent> = {
  type: TransportItemType.LOG,
  payload: {
    context: {},
    level: LogLevel.INFO,
    message: 'hi',
    timestamp: new Date().toISOString(),
  },
  meta: {
    session: { id: mockSessionId },
  },
};

const largeItem: TransportItem<LogEvent> = {
  type: TransportItemType.LOG,
  payload: {
    context: {},
    level: LogLevel.INFO,
    message: Buffer.alloc(60_000, 'I').toString('utf-8'),
    timestamp: new Date().toISOString(),
  },
  meta: {
    session: { id: mockSessionId },
  },
};

describe('FetchTransport', () => {
  beforeEach(() => {
    fetch.mockClear();
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('will send event over fetch', () => {
    const transport = new FetchTransport({
      url: 'http://example.com/collect',
    });

    transport.metas.value = { session: { id: mockSessionId } };

    transport.internalLogger = mockInternalLogger;

    transport.send([item]);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('http://example.com/collect', {
      body: JSON.stringify(getTransportBody([item])),
      headers: {
        'Content-Type': 'application/json',
        'x-faro-session-id': mockSessionId,
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

    transport.metas.value = { session: { id: mockSessionId } };

    transport.internalLogger = mockInternalLogger;

    for (let idx = 0; idx < 6; idx++) {
      transport.send([item]);
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

    transport.metas.value = { session: { id: mockSessionId } };

    transport.internalLogger = mockInternalLogger;

    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        status: 429,
        headers: {
          get: () => '',
        },
        text: () => Promise.resolve(),
      })
    );

    await transport.send([item]);
    expect(fetch).toHaveBeenCalledTimes(1);

    await transport.send([item]);
    expect(fetch).toHaveBeenCalledTimes(1);

    now += 1001;
    await transport.send([item]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('will back off on 429 for default interval if retry-after header present, with delay', async () => {
    let now = Date.now();

    const transport = new FetchTransport({
      url: 'http://example.com/collect',
      defaultRateLimitBackoffMs: 1000,
      getNow: () => now,
    });

    transport.metas.value = { session: { id: mockSessionId } };

    transport.internalLogger = mockInternalLogger;

    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        status: 429,
        headers: {
          get: () => '2',
        },
        text: () => Promise.resolve(),
      })
    );

    await transport.send([item]);
    expect(fetch).toHaveBeenCalledTimes(1);

    now += 1001;
    await transport.send([item]);
    expect(fetch).toHaveBeenCalledTimes(1);

    now += 1001;
    await transport.send([item]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('will back off on 429 for default interval if retry-after header present, with date', async () => {
    let now = Date.now();

    const transport = new FetchTransport({
      url: 'http://example.com/collect',
      defaultRateLimitBackoffMs: 1000,
      getNow: () => now,
    });

    transport.metas.value = { session: { id: mockSessionId } };

    transport.internalLogger = mockInternalLogger;

    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        status: 429,
        headers: {
          get: () => new Date(now + 3000).toISOString(),
        },
        text: () => Promise.resolve(),
      })
    );

    await transport.send([item]);
    expect(fetch).toHaveBeenCalledTimes(1);

    now += 1001;
    await transport.send([item]);
    expect(fetch).toHaveBeenCalledTimes(1);

    now += 2001;
    await transport.send([item]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('will turn off keepalive if the payload length is over 60_000', async () => {
    const transport = new FetchTransport({
      url: 'http://example.com/collect',
    });

    transport.metas.value = { session: { id: mockSessionId } };

    transport.internalLogger = mockInternalLogger;

    transport.send([largeItem]);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('http://example.com/collect', {
      body: JSON.stringify(getTransportBody([largeItem])),
      headers: {
        'Content-Type': 'application/json',
        'x-faro-session-id': mockSessionId,
      },
      keepalive: false,
      method: 'POST',
    });
  });

  it('will add global ignoredURLs to the ignoredUrls list ', async () => {
    const collectorUrl = 'http://example.com/collect';

    const transport = new FetchTransport({
      url: collectorUrl,
    });

    const globalIgnoreUrls = [/.*foo-analytics/, 'http://example-analytics.com'];

    const config = mockConfig({
      transports: [transport],
      ignoreUrls: globalIgnoreUrls,
    });

    const faro = initializeFaro(config);

    transport.internalLogger = mockInternalLogger;

    const ignoreUrls = faro.transports.transports.flatMap((transport) => transport.getIgnoreUrls());
    expect(ignoreUrls).toStrictEqual([collectorUrl, ...globalIgnoreUrls]);
  });

  it('will add static header values', () => {
    const transport = new FetchTransport({
      url: 'http://example.com/collect',
      requestOptions: {
        headers: {
          Authorization: 'Bearer static-token',
          'X-Static': 'static-value',
        },
      },
    });

    transport.metas.value = { session: { id: mockSessionId } };

    transport.internalLogger = mockInternalLogger;

    transport.send([item]);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      'http://example.com/collect',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer static-token',
          'X-Static': 'static-value',
        }),
      })
    );
  });

  it('will add dynamic header values from sync callbacks', () => {
    const transport = new FetchTransport({
      url: 'http://example.com/collect',
      requestOptions: {
        headers: {
          Authorization: () => `Bearer ${mockSessionId}-token`,
          'X-User': () => 'user-123',
        },
      },
    });

    transport.metas.value = { session: { id: mockSessionId } };

    transport.internalLogger = mockInternalLogger;

    transport.send([item]);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      'http://example.com/collect',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${mockSessionId}-token`,
          'X-User': 'user-123',
        }),
      })
    );
  });

  it('will add static header values and dynamic header values from sync callbacks', () => {
    const transport = new FetchTransport({
      url: 'http://example.com/collect',
      requestOptions: {
        headers: {
          Authorization: () => `Bearer ${mockSessionId}-token`,
          'X-Static': 'static-value',
        },
      },
    });

    transport.metas.value = { session: { id: mockSessionId } };

    transport.internalLogger = mockInternalLogger;

    transport.send([item]);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      'http://example.com/collect',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${mockSessionId}-token`,
          'X-Static': 'static-value',
        }),
      })
    );
  });

  it('creates a new faro session if collector response indicates an invalid session', async () => {
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        status: 202,
        headers: {
          get: (name: string) => ({ 'X-Faro-Session-Status': 'invalid' })[name],
        },

        text: () => Promise.resolve(),
      })
    );

    // getUserSessionUpdater returns a function that is then called with { forceSessionExtend: true }
    const mockGetUserSessionUpdater = jest.fn(() => jest.fn());
    jest.spyOn(sessionManagerUtilsMock, 'getUserSessionUpdater').mockImplementationOnce(mockGetUserSessionUpdater);

    const transport = new FetchTransport({
      url: 'http://example.com/collect',
    });

    transport.metas.value = { session: { id: mockSessionId } };
    transport.internalLogger = mockInternalLogger;
    // Bind logDebug to prevent 'this' context loss when passed as callback
    transport.logDebug = transport.logDebug.bind(transport);

    const config = mockConfig({
      transports: [transport],
      sessionTracking: {
        enabled: true,
        persistent: false,
      },
    });

    initializeFaro(config);

    await transport.send([item]);

    expect(mockGetUserSessionUpdater).toHaveBeenCalledTimes(1);
  });

  it('does not create a new faro session for standard collector responses', async () => {
    const mockGetUserSessionUpdater = jest.fn();
    jest.spyOn(sessionManagerUtilsMock, 'getUserSessionUpdater').mockImplementationOnce(mockGetUserSessionUpdater);

    const transport = new FetchTransport({
      url: 'http://example.com/collect',
    });

    transport.metas.value = { session: { id: mockSessionId } };
    transport.internalLogger = mockInternalLogger;

    const config = mockConfig({
      transports: [transport],
      sessionTracking: {
        enabled: true,
        persistent: false,
      },
    });

    initializeFaro(config);

    await transport.send([item]);

    expect(mockGetUserSessionUpdater).not.toHaveBeenCalled();
  });
});
