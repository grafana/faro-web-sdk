import { getTransportBody, initializeFaro, LogLevel, TransportItemType } from '@grafana/faro-core';
import type { LogEvent, TransportItem } from '@grafana/faro-core';
import { mockConfig, mockInternalLogger } from '@grafana/faro-core/src/testUtils';

import {
  PersistentSessionsManager,
  STORAGE_KEY,
  VolatileSessionsManager,
} from '../../instrumentations/session/sessionManager';
import type { FaroUserSession } from '../../instrumentations/session/sessionManager';

import { FetchTransport } from './transport';
import type { FetchTransportOptions } from './types';

interface TestResponse {
  status: number;
  headers: { get: (name: string) => string | undefined };
  text: () => Promise<void>;
}

const fetchMock = jest.fn<Promise<TestResponse>, [string, RequestInit]>();
const runtimeGlobal = globalThis as typeof globalThis & { fetch: typeof fetch };
runtimeGlobal.fetch = fetchMock as unknown as typeof fetch;

const {
  ReadableStream: NodeReadableStream,
  WritableStream: NodeWritableStream,
  CompressionStream: NodeCompressionStream,
} = require('node:stream/web');
Object.assign(globalThis, {
  ReadableStream: globalThis.ReadableStream ?? NodeReadableStream,
  WritableStream: globalThis.WritableStream ?? NodeWritableStream,
  CompressionStream: globalThis.CompressionStream ?? NodeCompressionStream,
});

const item: TransportItem<LogEvent> = {
  type: TransportItemType.LOG,
  payload: {
    context: {},
    level: LogLevel.INFO,
    message: 'hello',
    timestamp: new Date(0).toISOString(),
  },
  meta: {},
};

const response = (status: number, retryAfter?: string): TestResponse => ({
  status,
  headers: { get: (name) => (name === 'Retry-After' ? retryAfter : undefined) },
  text: async () => undefined,
});

const logger = () => ({
  ...mockInternalLogger,
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});

const createTransport = (options: Omit<FetchTransportOptions, 'url'> = {}) => {
  const transport = new FetchTransport({
    url: 'https://example.com/collect',
    requestTimeoutMs: 10000,
    getRandom: () => 0.5,
    ...options,
  });
  transport.metas.value = {};
  const internalLogger = logger();
  transport.internalLogger = internalLogger;
  return { transport, internalLogger };
};

describe('reliable FetchTransport', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(response(202));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('retries transient failures with the exact body and idempotency key', async () => {
    fetchMock.mockResolvedValueOnce(response(503)).mockResolvedValueOnce(response(202));
    const { transport, internalLogger } = createTransport();

    const sending = transport.send([item]);
    await jest.advanceTimersByTimeAsync(1100);
    await sending;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const first = fetchMock.mock.calls[0]![1];
    const second = fetchMock.mock.calls[1]![1];
    expect(second.body).toBe(first.body);
    expect((second.headers as Record<string, string>)['Idempotency-Key']).toBe(
      (first.headers as Record<string, string>)['Idempotency-Key']
    );
    expect(internalLogger.error).not.toHaveBeenCalled();
  });

  it('uses different idempotency keys for distinct batches', async () => {
    const { transport } = createTransport();
    await Promise.all([transport.send([item]), transport.send([item])]);

    const keys = fetchMock.mock.calls.map(([, init]) => (init.headers as Record<string, string>)['Idempotency-Key']);
    expect(keys[0]).not.toBe(keys[1]);
  });

  it('does not retry a permanent response and logs payload-free terminal loss', async () => {
    fetchMock.mockResolvedValueOnce(response(400));
    const { transport, internalLogger } = createTransport();
    await transport.send([item]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(internalLogger.error).toHaveBeenCalledWith(
      expect.any(String),
      'Permanent delivery failure',
      expect.objectContaining({ status: 400, attempts: 1 })
    );
    expect(JSON.stringify(internalLogger.error.mock.calls)).not.toContain(item.payload.message);
  });

  it('releases admission when request preparation fails', async () => {
    const header = jest.fn().mockRejectedValueOnce(new Error('header failed')).mockReturnValue('ready');
    const { transport } = createTransport({
      bufferSize: 1,
      requestOptions: { headers: { Authorization: header } },
    });

    await transport.send([item]);
    await transport.send([item]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(header).toHaveBeenCalledTimes(2);
  });

  it('keeps processing when Promise.prototype.finally is unavailable', async () => {
    const finallyDescriptor = Object.getOwnPropertyDescriptor(Promise.prototype, 'finally');
    Object.defineProperty(Promise.prototype, 'finally', { configurable: true, value: undefined });

    try {
      const { transport } = createTransport({ concurrency: 1 });
      const firstSending = transport.send([item]);
      await jest.advanceTimersByTimeAsync(0);
      await firstSending;

      const secondSending = transport.send([item]);
      await jest.advanceTimersByTimeAsync(0);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      await secondSending;
    } finally {
      if (finallyDescriptor) {
        Object.defineProperty(Promise.prototype, 'finally', finallyDescriptor);
      } else {
        delete (Promise.prototype as Partial<Promise<unknown>>).finally;
      }
    }
  });

  it('uses the configured bounded exponential retry schedule', async () => {
    fetchMock.mockResolvedValue(response(503));
    const { transport, internalLogger } = createTransport({
      retry: { maxAttempts: 2, initialBackoffMs: 20, maxBackoffMs: 100, backoffMultiplier: 3 },
      getRandom: () => 0,
    });

    const sending = transport.send([item]);
    await jest.advanceTimersByTimeAsync(19);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    await sending;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(internalLogger.error).toHaveBeenCalledWith(
      expect.any(String),
      'Delivery retries exhausted',
      expect.objectContaining({ attempts: 2, status: 503 })
    );
  });

  it('honours and jitters a valid Retry-After interval', async () => {
    fetchMock.mockResolvedValueOnce(response(429, '1')).mockResolvedValueOnce(response(202));
    const { transport } = createTransport();

    const sending = transport.send([item]);
    await jest.advanceTimersByTimeAsync(1099);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    await sending;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('drops a retry whose Retry-After exceeds the configured ceiling', async () => {
    fetchMock.mockResolvedValueOnce(response(429, '31'));
    const { transport, internalLogger } = createTransport({ retry: { maxBackoffMs: 30000 } });
    await transport.send([item]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(internalLogger.error).toHaveBeenCalledWith(
      expect.any(String),
      'Permanent delivery failure',
      expect.objectContaining({ attempts: 1, status: 429 })
    );
  });

  it('drops a retry whose numeric Retry-After overflows', async () => {
    fetchMock.mockResolvedValueOnce(response(429, '9'.repeat(400))).mockResolvedValueOnce(response(202));
    const { transport } = createTransport();

    const sending = transport.send([item]);
    await jest.advanceTimersByTimeAsync(1100);
    await sending;

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses fallback backoff for a Retry-After value that is not an HTTP date', async () => {
    fetchMock.mockResolvedValueOnce(response(503, '2026-08-30')).mockResolvedValueOnce(response(202));
    const { transport } = createTransport({ getNow: () => Date.parse('2026-08-26T00:00:00Z') });

    const sending = transport.send([item]);
    await jest.advanceTimersByTimeAsync(1099);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    await sending;

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('interprets an asctime Retry-After date as GMT', async () => {
    const previousTimeZone = process.env['TZ'];
    process.env['TZ'] = 'Europe/Warsaw';

    try {
      fetchMock.mockResolvedValueOnce(response(503, 'Sun Aug 30 12:00:01 2026')).mockResolvedValueOnce(response(202));
      const { transport } = createTransport({ getNow: () => Date.parse('2026-08-30T12:00:00Z') });

      const sending = transport.send([item]);
      await jest.advanceTimersByTimeAsync(1099);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(1);
      await sending;

      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      if (previousTimeZone == null) {
        delete process.env['TZ'];
      } else {
        process.env['TZ'] = previousTimeZone;
      }
    }
  });

  it('uses fallback backoff for an impossible Retry-After date', async () => {
    fetchMock
      .mockResolvedValueOnce(response(503, 'Tue, 31 Feb 2026 00:00:01 GMT'))
      .mockResolvedValueOnce(response(202));
    const { transport } = createTransport({ getNow: () => Date.parse('2026-02-28T00:00:00Z') });

    const sending = transport.send([item]);
    await jest.advanceTimersByTimeAsync(1099);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    await sending;

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps unrelated delivery moving while one batch is waiting', async () => {
    fetchMock
      .mockResolvedValueOnce(response(429, '1'))
      .mockResolvedValueOnce(response(202))
      .mockResolvedValueOnce(response(202));
    const { transport } = createTransport();

    const waiting = transport.send([item]);
    await jest.advanceTimersByTimeAsync(0);
    await transport.send([item]);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(1100);
    await waiting;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retries each batch when its own backoff expires', async () => {
    fetchMock
      .mockResolvedValueOnce(response(429, '30'))
      .mockResolvedValueOnce(response(429, '1'))
      .mockResolvedValue(response(202));
    const { transport } = createTransport({
      concurrency: 2,
      getRandom: () => 0,
      retry: { maxBackoffMs: 60000 },
    });

    const first = transport.send([item]);
    const second = transport.send([item]);
    await jest.advanceTimersByTimeAsync(0);
    const firstKey = (fetchMock.mock.calls[0]![1].headers as Record<string, string>)['Idempotency-Key'];
    const secondKey = (fetchMock.mock.calls[1]![1].headers as Record<string, string>)['Idempotency-Key'];

    await jest.advanceTimersByTimeAsync(1000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect((fetchMock.mock.calls[2]![1].headers as Record<string, string>)['Idempotency-Key']).toBe(secondKey);

    await jest.advanceTimersByTimeAsync(29000);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect((fetchMock.mock.calls[3]![1].headers as Record<string, string>)['Idempotency-Key']).toBe(firstKey);
    await Promise.all([first, second]);
  });

  it('keeps admission reserved while a batch waits for redelivery', async () => {
    fetchMock.mockResolvedValueOnce(response(503)).mockResolvedValue(response(202));
    const { transport, internalLogger } = createTransport({ bufferSize: 1 });

    const waiting = transport.send([item]);
    await jest.advanceTimersByTimeAsync(0);
    await transport.send([item]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(internalLogger.error).toHaveBeenCalledWith(
      expect.any(String),
      'Permanent delivery failure',
      expect.objectContaining({ attempts: 0 })
    );

    await jest.advanceTimersByTimeAsync(1100);
    await waiting;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throttles batches that share one retry deadline into separate ticks', async () => {
    fetchMock
      .mockResolvedValueOnce(response(429, '1'))
      .mockResolvedValueOnce(response(429, '1'))
      .mockResolvedValue(response(202));
    const { transport } = createTransport();

    const first = transport.send([item]);
    const second = transport.send([item]);
    await jest.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(1100);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    await jest.advanceTimersByTimeAsync(1);
    await Promise.all([first, second]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('spaces redeliveries that queue behind saturated concurrency', async () => {
    let resolveFirstBlocker!: (value: TestResponse) => void;
    let resolveSecondBlocker!: (value: TestResponse) => void;
    fetchMock
      .mockResolvedValueOnce(response(429, '1'))
      .mockResolvedValueOnce(response(429, '1'))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstBlocker = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecondBlocker = resolve;
          })
      )
      .mockResolvedValue(response(202));
    const { transport } = createTransport({ concurrency: 2, getRandom: () => 0 });

    const firstWaiting = transport.send([item]);
    const secondWaiting = transport.send([item]);
    await jest.advanceTimersByTimeAsync(0);
    const firstBlocker = transport.send([item]);
    const secondBlocker = transport.send([item]);
    await jest.advanceTimersByTimeAsync(1001);

    resolveFirstBlocker(response(202));
    resolveSecondBlocker(response(202));
    await jest.advanceTimersByTimeAsync(0);

    expect(fetchMock).toHaveBeenCalledTimes(5);
    await jest.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(6);
    await Promise.all([firstWaiting, secondWaiting, firstBlocker, secondBlocker]);
  });

  it('does not share retry throttling between transport instances', async () => {
    fetchMock
      .mockResolvedValueOnce(response(429, '1'))
      .mockResolvedValueOnce(response(429, '1'))
      .mockResolvedValue(response(202));
    const firstTransport = createTransport().transport;
    const secondTransport = createTransport().transport;

    const first = firstTransport.send([item]);
    const second = secondTransport.send([item]);
    await jest.advanceTimersByTimeAsync(1100);
    await Promise.all([first, second]);

    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('declines synchronously reserved overflow before compression', async () => {
    const compression = jest.spyOn(globalThis, 'CompressionStream');
    const { transport, internalLogger } = createTransport({ bufferSize: 1, requestCompression: true });

    const first = transport.send([item]);
    const second = transport.send([item]);
    await Promise.all([first, second]);

    expect(compression).toHaveBeenCalledTimes(1);
    expect(internalLogger.error).toHaveBeenCalledWith(
      expect.any(String),
      'Permanent delivery failure',
      expect.objectContaining({ attempts: 0 })
    );
  });

  it('counts the non-keepalive fallback toward the configured attempt limit', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('keepalive network failure'))
      .mockRejectedValueOnce(new TypeError('fallback network failure'))
      .mockResolvedValueOnce(response(202));
    const { transport, internalLogger } = createTransport({ retry: { maxAttempts: 2 } });
    const sending = transport.send([item]);
    await jest.advanceTimersByTimeAsync(1100);
    await sending;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]![1].keepalive).toBe(true);
    expect(fetchMock.mock.calls[1]![1].keepalive).toBe(false);
    expect((fetchMock.mock.calls[0]![1].headers as Record<string, string>)['Idempotency-Key']).toBe(
      (fetchMock.mock.calls[1]![1].headers as Record<string, string>)['Idempotency-Key']
    );
    expect(internalLogger.error).toHaveBeenCalledWith(
      expect.any(String),
      'Delivery retries exhausted',
      expect.objectContaining({ attempts: 2 })
    );
  });

  it('flushes a waiting batch once on page hide without scheduling another retry', async () => {
    fetchMock.mockResolvedValueOnce(response(503)).mockResolvedValueOnce(response(503));
    const { transport, internalLogger } = createTransport();
    const sending = transport.send([item]);
    await jest.advanceTimersByTimeAsync(0);

    window.dispatchEvent(new Event('pagehide'));
    await jest.advanceTimersByTimeAsync(0);
    await sending;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]![1].keepalive).toBe(true);
    await jest.advanceTimersByTimeAsync(60000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(internalLogger.error).toHaveBeenCalledTimes(1);
  });

  it('does not schedule a retry when page hide occurs during an active request', async () => {
    let resolvePending!: (response: TestResponse) => void;
    const pending = new Promise<TestResponse>((resolve) => {
      resolvePending = resolve;
    });
    fetchMock.mockImplementationOnce(() => pending);
    const { transport, internalLogger } = createTransport();
    const sending = transport.send([item]);
    await jest.advanceTimersByTimeAsync(0);

    window.dispatchEvent(new Event('pagehide'));
    resolvePending(response(503));
    await sending;
    await jest.advanceTimersByTimeAsync(60000);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(internalLogger.error).toHaveBeenCalledWith(
      expect.any(String),
      'Permanent delivery failure',
      expect.objectContaining({ attempts: 1, status: 503 })
    );
  });

  it('resumes retries after restoration from the back-forward cache', async () => {
    fetchMock.mockResolvedValueOnce(response(503)).mockResolvedValueOnce(response(202));
    const { transport } = createTransport();

    const pageShowEvent = new Event('pageshow');
    Object.defineProperty(pageShowEvent, 'persisted', { value: true });
    window.dispatchEvent(new Event('pagehide'));
    window.dispatchEvent(pageShowEvent);

    const sending = transport.send([item]);
    await jest.advanceTimersByTimeAsync(1100);
    await sending;

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reports zero attempts when the caller already cancelled the request', async () => {
    const controller = new AbortController();
    controller.abort();
    const { transport, internalLogger } = createTransport({ requestOptions: { signal: controller.signal } });

    await transport.send([item]);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(internalLogger.error).toHaveBeenCalledWith(
      expect.any(String),
      'Permanent delivery failure',
      expect.objectContaining({ attempts: 0 })
    );
  });

  it('times out a hung attempt and retries it', async () => {
    fetchMock
      .mockImplementationOnce(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
          })
      )
      .mockResolvedValueOnce(response(202));
    const { transport } = createTransport({ requestTimeoutMs: 10, retry: { initialBackoffMs: 5 }, getRandom: () => 0 });

    const sending = transport.send([item]);
    await jest.advanceTimersByTimeAsync(15);
    await sending;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('sends the expected serialized request', async () => {
    const { transport } = createTransport();
    await transport.send([item]);

    expect(fetchMock.mock.calls[0]![1]).toEqual(
      expect.objectContaining({ body: JSON.stringify(getTransportBody([item])), method: 'POST' })
    );
  });

  describe('session identity and invalidation handling', () => {
    let mockStorage: Record<string, string> = {};

    beforeEach(() => {
      mockStorage = {};
      jest.spyOn(global.Storage.prototype, 'setItem').mockImplementation((key, value) => {
        mockStorage[key] = value;
      });
      jest.spyOn(global.Storage.prototype, 'getItem').mockImplementation((key) => mockStorage[key] ?? null);
    });

    const itemWithSession = (sessionId: string): TransportItem<LogEvent> => ({
      ...item,
      meta: { session: { id: sessionId } },
    });

    const sessionInvalidResponse = (): TestResponse => ({
      status: 202,
      headers: { get: (name) => (name === 'X-Faro-Session-Status' ? 'invalid' : undefined) },
      text: async () => undefined,
    });

    const storedSession = (sessionId: string): FaroUserSession => ({
      sessionId,
      started: Date.now(),
      lastActivity: Date.now(),
      isSampled: true,
    });

    // Wires the transport into a real, isolated Faro instance so the invalidation guard's
    // "current in-memory session" and the session updater's global lookups agree.
    const setupFaroBackedTransport = (persistent = false) => {
      const faro = initializeFaro(mockConfig({ sessionTracking: { enabled: true, persistent } }));
      const { transport, internalLogger } = createTransport();
      transport.config = faro.config;
      transport.metas = faro.metas;
      return { faro, transport, internalLogger };
    };

    it('derives the header session id from the same payload snapshot as the body, unaffected by async header rotation', async () => {
      const { transport } = createTransport({
        requestOptions: {
          headers: {
            Authorization: async () => {
              // A session rotation that happens while an async header resolves must not leak
              // into a request whose identity was already captured.
              transport.metas.value = { session: { id: 'rotated-during-header' } };
              return 'token';
            },
          },
        },
      });

      await transport.send([itemWithSession('A')]);

      const [, init] = fetchMock.mock.calls[0]!;
      const headers = init.headers as Record<string, string>;
      expect(headers['x-faro-session-id']).toBe('A');
      expect(JSON.parse(init.body as string).meta.session.id).toBe('A');
    });

    it('keeps body and header aligned with the queued snapshot when the current session has already moved on', async () => {
      const { transport } = createTransport();
      transport.metas.value = { session: { id: 'B' } };

      await transport.send([itemWithSession('A')]);

      const [, init] = fetchMock.mock.calls[0]!;
      const headers = init.headers as Record<string, string>;
      expect(headers['x-faro-session-id']).toBe('A');
      expect(JSON.parse(init.body as string).meta.session.id).toBe('A');
    });

    it('preserves the same body and x-faro-session-id header across retries even if the session rotates mid-flight', async () => {
      fetchMock.mockResolvedValueOnce(response(503)).mockResolvedValueOnce(response(202));
      const { transport } = createTransport({ retry: { initialBackoffMs: 1000 } });

      const sending = transport.send([itemWithSession('A')]);
      await jest.advanceTimersByTimeAsync(0);
      transport.metas.value = { session: { id: 'B' } };
      await jest.advanceTimersByTimeAsync(1100);
      await sending;

      expect(fetchMock).toHaveBeenCalledTimes(2);
      const [first, second] = fetchMock.mock.calls.map(([, init]) => init);
      expect(second!.body).toBe(first!.body);
      expect((second!.headers as Record<string, string>)['x-faro-session-id']).toBe(
        (first!.headers as Record<string, string>)['x-faro-session-id']
      );
      expect((first!.headers as Record<string, string>)['x-faro-session-id']).toBe('A');
    });

    it('rotates the session when an invalid response matches the current session in memory and storage', async () => {
      fetchMock.mockResolvedValueOnce(sessionInvalidResponse());
      const { faro, transport } = setupFaroBackedTransport();
      faro.metas.add({ session: { id: 'A' } });
      VolatileSessionsManager.storeUserSession(storedSession('A'));

      await transport.send([itemWithSession('A')]);

      const stored = JSON.parse(mockStorage[STORAGE_KEY]!);
      expect(stored.sessionId).not.toBe('A');
    });

    it('ignores an invalid response whose session has already rotated in memory and storage', async () => {
      const { faro, transport } = setupFaroBackedTransport();
      faro.metas.add({ session: { id: 'A' } });
      VolatileSessionsManager.storeUserSession(storedSession('A'));

      let resolveFetch!: (value: TestResponse) => void;
      fetchMock.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          })
      );

      const sending = transport.send([itemWithSession('A')]);
      await jest.advanceTimersByTimeAsync(0);

      // Another update rotates both the in-memory and persisted session before the response arrives.
      faro.metas.add({ session: { id: 'B' } });
      VolatileSessionsManager.storeUserSession(storedSession('B'));

      resolveFetch(sessionInvalidResponse());
      await sending;

      const stored = JSON.parse(mockStorage[STORAGE_KEY]!);
      expect(stored.sessionId).toBe('B');
    });

    it('rotates only once for concurrent invalid responses belonging to the same session', async () => {
      const { faro, transport } = setupFaroBackedTransport();
      faro.api.setSession({ id: 'A' });
      VolatileSessionsManager.storeUserSession(storedSession('A'));
      const responses: Array<(value: TestResponse) => void> = [];
      fetchMock.mockImplementation(() => new Promise((resolve) => responses.push(resolve)));
      const first = transport.send([itemWithSession('A')]);
      const second = transport.send([itemWithSession('A')]);
      await jest.advanceTimersByTimeAsync(0);

      responses[0]!(sessionInvalidResponse());
      await first;
      const renewed = faro.api.getSession()?.id;
      expect(renewed).not.toBe('A');
      responses[1]!(sessionInvalidResponse());
      await second;
      expect(faro.api.getSession()?.id).toBe(renewed);
      expect(JSON.parse(mockStorage[STORAGE_KEY]!).sessionId).toBe(renewed);
    });

    it('ignores an invalid response when another tab has rotated the persisted session', async () => {
      const { faro, transport } = setupFaroBackedTransport(true);
      faro.metas.add({ session: { id: 'A' } });
      PersistentSessionsManager.storeUserSession(storedSession('A'));

      let resolveFetch!: (value: TestResponse) => void;
      fetchMock.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          })
      );

      const sending = transport.send([itemWithSession('A')]);
      await jest.advanceTimersByTimeAsync(0);

      // Another tab rotates the shared, persisted session while this tab's in-memory session stays A.
      PersistentSessionsManager.storeUserSession(storedSession('B'));

      resolveFetch(sessionInvalidResponse());
      await sending;

      const stored = JSON.parse(mockStorage[STORAGE_KEY]!);
      expect(stored.sessionId).toBe('B');
    });
  });
});
