import { getTransportBody, LogLevel, TransportItemType } from '@grafana/faro-core';
import type { LogEvent, TransportItem } from '@grafana/faro-core';
import { mockInternalLogger } from '@grafana/faro-core/src/testUtils';

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

  it('performs the non-keepalive fallback inline without consuming an attempt', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('network')).mockResolvedValueOnce(response(202));
    const { transport, internalLogger } = createTransport({ retry: { maxAttempts: 1 } });
    await transport.send([item]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]![1].keepalive).toBe(true);
    expect(fetchMock.mock.calls[1]![1].keepalive).toBe(false);
    expect((fetchMock.mock.calls[0]![1].headers as Record<string, string>)['Idempotency-Key']).toBe(
      (fetchMock.mock.calls[1]![1].headers as Record<string, string>)['Idempotency-Key']
    );
    expect(internalLogger.error).not.toHaveBeenCalled();
  });

  it('flushes a waiting batch once on page hide without scheduling another retry', async () => {
    fetchMock.mockResolvedValueOnce(response(503)).mockResolvedValueOnce(response(503));
    const { transport, internalLogger } = createTransport();
    const sending = transport.send([item]);
    await jest.advanceTimersByTimeAsync(0);

    window.dispatchEvent(new PageTransitionEvent('pagehide'));
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

    window.dispatchEvent(new PageTransitionEvent('pagehide'));
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
});
