import {
  getTransportBody,
  initializeFaro,
  LogEvent,
  LogLevel,
  TransportItem,
  TransportItemType,
} from '@grafana/faro-core';
import { mockConfig, mockInternalLogger } from '@grafana/faro-core/src/testUtils';

import { FetchTransport } from './transport';

const fetch = jest.fn(() =>
  Promise.resolve({
    status: 202,
    text: () => Promise.resolve(),
    headers: {
      get: () => null,
    },
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
    message: 'I'.repeat(60_000),
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
    // Reset fetch implementation to default
    fetch.mockImplementation(() =>
      Promise.resolve({
        status: 202,
        text: () => Promise.resolve(),
        headers: {
          get: () => null,
        },
      })
    );
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('will send event over fetch', async () => {
    const transport = new FetchTransport({
      url: 'http://example.com/collect',
    });

    transport.metas.value = { session: { id: mockSessionId } };

    transport.internalLogger = mockInternalLogger;

    await transport.send([item]);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('http://example.com/collect', {
      body: JSON.stringify(getTransportBody([item])),
      headers: {
        'Content-Type': 'application/json',
        'x-faro-session-id': mockSessionId,
      },
      method: 'POST',
    });
  });

  it('will send event with API key if provided', async () => {
    const transport = new FetchTransport({
      url: 'http://example.com/collect',
      apiKey: 'test-api-key',
    });

    transport.metas.value = { session: { id: mockSessionId } };
    transport.internalLogger = mockInternalLogger;

    await transport.send([item]);

    expect(fetch).toHaveBeenCalledWith('http://example.com/collect', {
      body: JSON.stringify(getTransportBody([item])),
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'test-api-key',
        'x-faro-session-id': mockSessionId,
      },
      method: 'POST',
    });
  });

  it('will not send events if buffer size is exhausted', async () => {
    const transport = new FetchTransport({
      url: 'http://example.com/collect',
      bufferSize: 3,
    });

    transport.metas.value = { session: { id: mockSessionId } };
    transport.internalLogger = mockInternalLogger;

    // Send 6 items but buffer size is 3
    const sendPromises = [];
    for (let idx = 0; idx < 6; idx++) {
      sendPromises.push(transport.send([item]));
    }

    await Promise.all(sendPromises);

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
          get: () => null,
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

  it('will back off on 429 for retry-after header with delay in seconds', async () => {
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
          get: () => '2', // 2 seconds
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

  it('will back off on 429 for retry-after header with date', async () => {
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

  it('will handle large payloads', async () => {
    const transport = new FetchTransport({
      url: 'http://example.com/collect',
    });

    transport.metas.value = { session: { id: mockSessionId } };
    transport.internalLogger = mockInternalLogger;

    await transport.send([largeItem]);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('http://example.com/collect', {
      body: JSON.stringify(getTransportBody([largeItem])),
      headers: {
        'Content-Type': 'application/json',
        'x-faro-session-id': mockSessionId,
      },
      method: 'POST',
    });
  });

  it('will add global ignoredURLs to the ignoredUrls list', () => {
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

  it('handles session expired header from collector', async () => {
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        status: 202,
        headers: {
          get: (name: string) => (name === 'X-Faro-Session-Status' ? 'invalid' : null),
        },
        text: () => Promise.resolve(),
      })
    );

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

    // Session extension is not yet implemented for RN, but should not throw
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('does not extend session for standard collector responses', async () => {
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

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('handles fetch errors gracefully', async () => {
    fetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')));

    const transport = new FetchTransport({
      url: 'http://example.com/collect',
    });

    transport.metas.value = { session: { id: mockSessionId } };
    transport.internalLogger = mockInternalLogger;

    // Should not throw
    await expect(transport.send([item])).resolves.not.toThrow();

    // Verify fetch was called (and failed)
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('supports custom request options', async () => {
    const transport = new FetchTransport({
      url: 'http://example.com/collect',
      requestOptions: {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
        credentials: 'include',
      },
    });

    transport.metas.value = { session: { id: mockSessionId } };
    transport.internalLogger = mockInternalLogger;

    await transport.send([item]);

    expect(fetch).toHaveBeenCalledWith('http://example.com/collect', {
      body: JSON.stringify(getTransportBody([item])),
      headers: {
        'Content-Type': 'application/json',
        'X-Custom-Header': 'custom-value',
        'x-faro-session-id': mockSessionId,
      },
      method: 'POST',
      credentials: 'include',
    });
  });

  it('isBatched returns true', () => {
    const transport = new FetchTransport({
      url: 'http://example.com/collect',
    });

    expect(transport.isBatched()).toBe(true);
  });

  it('sends without session ID if no session is available', async () => {
    const transport = new FetchTransport({
      url: 'http://example.com/collect',
    });

    transport.metas.value = {};
    transport.internalLogger = mockInternalLogger;

    await transport.send([item]);

    expect(fetch).toHaveBeenCalledWith('http://example.com/collect', {
      body: JSON.stringify(getTransportBody([item])),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
  });

  describe('Circuit Breaker - Offline Behavior', () => {
    it('activates circuit breaker after 3 consecutive failures', async () => {
      let now = Date.now();

      const transport = new FetchTransport({
        url: 'http://example.com/collect',
        getNow: () => now,
      });

      transport.metas.value = { session: { id: mockSessionId } };
      transport.internalLogger = mockInternalLogger;

      // Mock 3 consecutive failures (simulating offline device)
      fetch.mockImplementation(() => Promise.reject(new Error('Network error')));

      // First 3 failures should increment the counter
      await transport.send([item]);
      await transport.send([item]);
      await transport.send([item]);

      expect(fetch).toHaveBeenCalledTimes(3);

      // After 3 failures, circuit breaker should be active
      // Next attempt should be silently dropped (no fetch call)
      await transport.send([item]);
      expect(fetch).toHaveBeenCalledTimes(3); // Still 3, no new call

      // Fast forward past backoff period (30 seconds)
      now += 30001;

      // Reset fetch to succeed
      fetch.mockImplementation(() =>
        Promise.resolve({
          status: 202,
          text: () => Promise.resolve(),
          headers: {
            get: () => null,
          },
        })
      );

      // Now it should try again
      await transport.send([item]);
      expect(fetch).toHaveBeenCalledTimes(4);
    });

    it('resets failure counter on successful request', async () => {
      let now = Date.now();

      const transport = new FetchTransport({
        url: 'http://example.com/collect',
        getNow: () => now,
      });

      transport.metas.value = { session: { id: mockSessionId } };
      transport.internalLogger = mockInternalLogger;

      // Mock 2 failures, then success
      fetch
        .mockImplementationOnce(() => Promise.reject(new Error('Network error')))
        .mockImplementationOnce(() => Promise.reject(new Error('Network error')))
        .mockImplementationOnce(() =>
          Promise.resolve({
            status: 202,
            text: () => Promise.resolve(),
            headers: {
              get: () => null,
            },
          })
        );

      await transport.send([item]); // Failure 1
      await transport.send([item]); // Failure 2
      await transport.send([item]); // Success - should reset counter

      expect(fetch).toHaveBeenCalledTimes(3);

      // Mock 2 more failures
      fetch
        .mockImplementationOnce(() => Promise.reject(new Error('Network error')))
        .mockImplementationOnce(() => Promise.reject(new Error('Network error')));

      await transport.send([item]); // Failure 1 (counter reset, so this is first)
      await transport.send([item]); // Failure 2

      // Circuit breaker should NOT be active yet (needs 3 failures)
      await transport.send([item]); // This should still attempt
      expect(fetch).toHaveBeenCalledTimes(6); // All 6 calls were made
    });

    it('silently drops events during backoff period', async () => {
      let now = Date.now();

      const transport = new FetchTransport({
        url: 'http://example.com/collect',
        getNow: () => now,
      });

      transport.metas.value = { session: { id: mockSessionId } };
      transport.internalLogger = mockInternalLogger;

      // Mock 3 consecutive failures to trigger circuit breaker
      fetch.mockImplementation(() => Promise.reject(new Error('Network error')));

      await transport.send([item]);
      await transport.send([item]);
      await transport.send([item]);

      expect(fetch).toHaveBeenCalledTimes(3);

      // During backoff period, events should be silently dropped
      await transport.send([item]);
      await transport.send([item]);
      await transport.send([item]);
      expect(fetch).toHaveBeenCalledTimes(3); // No new calls

      // Advance time by 15 seconds (still in backoff)
      now += 15000;

      await transport.send([item]);
      expect(fetch).toHaveBeenCalledTimes(3); // Still no new calls

      // Advance past backoff period
      now += 15001; // Total: 30001ms

      // Should try again now
      await transport.send([item]);
      expect(fetch).toHaveBeenCalledTimes(4);
    });

    it('does not log errors to console (prevents infinite loops)', async () => {
      const consoleSpy = jest.spyOn(console, 'error');
      const consoleWarnSpy = jest.spyOn(console, 'warn');
      const consoleLogSpy = jest.spyOn(console, 'log');

      const transport = new FetchTransport({
        url: 'http://example.com/collect',
      });

      transport.metas.value = { session: { id: mockSessionId } };
      transport.internalLogger = mockInternalLogger;

      // Mock failures
      fetch.mockImplementation(() => Promise.reject(new Error('Network error')));

      // Send multiple failing requests
      await transport.send([item]);
      await transport.send([item]);
      await transport.send([item]);

      // Verify NO console calls were made (to prevent infinite loops in RN)
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('handles buffer full errors silently', async () => {
      const consoleSpy = jest.spyOn(console, 'error');

      const transport = new FetchTransport({
        url: 'http://example.com/collect',
        bufferSize: 1, // Very small buffer
        concurrency: 1,
      });

      transport.metas.value = { session: { id: mockSessionId } };
      transport.internalLogger = mockInternalLogger;

      // Make fetch slow to fill up buffer
      fetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  status: 202,
                  text: () => Promise.resolve(),
                  headers: {
                    get: () => null,
                  },
                }),
              100
            )
          )
      );

      // Try to send multiple items quickly to overflow buffer
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(transport.send([item]));
      }

      await Promise.all(promises);

      // Should not log buffer full errors to console
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('continues to respect rate limiting during circuit breaker recovery', async () => {
      let now = Date.now();

      const transport = new FetchTransport({
        url: 'http://example.com/collect',
        getNow: () => now,
      });

      transport.metas.value = { session: { id: mockSessionId } };
      transport.internalLogger = mockInternalLogger;

      // Trigger rate limit (429)
      fetch.mockImplementationOnce(() =>
        Promise.resolve({
          status: 429,
          headers: {
            get: () => '5', // 5 seconds
          },
          text: () => Promise.resolve(),
        })
      );

      await transport.send([item]);
      expect(fetch).toHaveBeenCalledTimes(1);

      // Should be in rate limit backoff
      await transport.send([item]);
      expect(fetch).toHaveBeenCalledTimes(1);

      // Advance past rate limit backoff
      now += 5001;

      // Now trigger circuit breaker with 3 failures
      fetch.mockImplementation(() => Promise.reject(new Error('Network error')));

      await transport.send([item]);
      await transport.send([item]);
      await transport.send([item]);

      expect(fetch).toHaveBeenCalledTimes(4); // 1 + 3 failures

      // Should be in circuit breaker backoff now
      await transport.send([item]);
      expect(fetch).toHaveBeenCalledTimes(4); // No new call
    });
  });
});
