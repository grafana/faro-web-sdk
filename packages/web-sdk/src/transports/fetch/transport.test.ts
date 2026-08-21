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
import type { FetchTransportOptions, FetchTransportRetryOptions } from './types';

interface TestResponse {
  status: number;
  headers: {
    get: (name: string) => string | undefined;
  };
  text: () => Promise<void>;
}

const createResponse = (status: number, retryAfter?: string): TestResponse => ({
  status,
  headers: {
    get: (name: string): string | undefined => (name === 'Retry-After' ? retryAfter : undefined),
  },
  text: () => Promise.resolve(),
});

const createAcceptedResponse = () => createResponse(202);

const fetch = jest.fn(() => Promise.resolve(createAcceptedResponse()));
const createMockLogger = () => ({
  ...mockInternalLogger,
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});
const immediateRetry = {
  initialBackoffMs: 1,
  maxBackoffMs: 1,
  backoffMultiplier: 1,
} as const;

(global as any).fetch = fetch;

// jsdom doesn't provide web stream globals or Response — use Node's implementations
const {
  ReadableStream: NodeReadableStream,
  WritableStream: NodeWritableStream,
  CompressionStream: NodeCompressionStream,
} = require('node:stream/web');

if (typeof globalThis.ReadableStream === 'undefined') {
  (globalThis as any).ReadableStream = NodeReadableStream;
}
if (typeof globalThis.WritableStream === 'undefined') {
  (globalThis as any).WritableStream = NodeWritableStream;
}
if (typeof globalThis.CompressionStream === 'undefined') {
  (globalThis as any).CompressionStream = NodeCompressionStream;
}

const mockSessionId = '123';
const COLLECTOR_URL = 'http://example.com/collect';

const createTransport = (
  options: Omit<FetchTransportOptions, 'url'> = {},
  logger: FetchTransport['internalLogger'] = mockInternalLogger
) => {
  const transport = new FetchTransport({ url: COLLECTOR_URL, ...options });
  transport.metas.value = { session: { id: mockSessionId } };
  transport.internalLogger = logger;
  return transport;
};

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

const mediumItem: TransportItem<LogEvent> = {
  type: TransportItemType.LOG,
  payload: {
    context: {},
    level: LogLevel.INFO,
    message: Buffer.alloc(40_000, 'I').toString('utf-8'),
    timestamp: new Date().toISOString(),
  },
  meta: {
    session: { id: mockSessionId },
  },
};

describe('FetchTransport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockReset();
    fetch.mockImplementation(() => Promise.resolve(createAcceptedResponse()));
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('will send event over fetch', () => {
    const transport = createTransport();

    transport.send([item]);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('http://example.com/collect', {
      body: JSON.stringify(getTransportBody([item])),
      headers: {
        'Content-Type': 'application/json',
        'x-faro-session-id': mockSessionId,
      },

      keepalive: true,
      signal: expect.any(AbortSignal),
      method: 'POST',
    });
  });

  it('sends without a request timeout when AbortController is unavailable', async () => {
    const runtimeGlobal: { AbortController?: typeof AbortController } = globalThis;
    const original = runtimeGlobal.AbortController;
    delete runtimeGlobal.AbortController;

    try {
      const transport = createTransport();

      await transport.send([item]);

      expect(fetch).toHaveBeenCalledTimes(1);
      const request = (fetch.mock.calls[0] as unknown[])[1] as RequestInit;
      expect(request.signal).toBeUndefined();
    } finally {
      runtimeGlobal.AbortController = original;
    }
  });
  it('keeps an accepted outcome when draining the response body fails', async () => {
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ...createAcceptedResponse(),
        text: () => Promise.reject(new Error('Could not drain response')),
      })
    );

    const logger = createMockLogger();
    const transport = createTransport({}, logger);

    await transport.send([item]);
    await Promise.resolve();

    expect(logger.error).not.toHaveBeenCalled();
  });

  it('retries a retryable response with the same body', async () => {
    jest.useFakeTimers();

    fetch
      .mockImplementationOnce(() => Promise.resolve(createResponse(503, undefined)))
      .mockImplementationOnce(() => Promise.resolve(createAcceptedResponse()));

    const transport = createTransport({
      retry: { maxAttempts: 2, ...immediateRetry },
    });

    const sendPromise = transport.send([item]);
    await jest.advanceTimersByTimeAsync(2);
    await sendPromise;

    expect(fetch).toHaveBeenCalledTimes(2);

    const firstRequest = (fetch.mock.calls[0] as unknown[])[1] as RequestInit;
    const secondRequest = (fetch.mock.calls[1] as unknown[])[1] as RequestInit;
    expect(secondRequest.body).toBe(firstRequest.body);
  });

  it.each([408, 425, 429, 500, 502, 503, 504])('retries HTTP %s by default', async (status) => {
    jest.useFakeTimers();

    fetch
      .mockImplementationOnce(() => Promise.resolve(createResponse(status)))
      .mockImplementationOnce(() => Promise.resolve(createAcceptedResponse()));

    const transport = createTransport({
      defaultRateLimitBackoffMs: 1,
      retry: { maxAttempts: 2, ...immediateRetry },
    });

    const sendPromise = transport.send([item]);
    await jest.advanceTimersByTimeAsync(2);
    await sendPromise;
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each([300, 400, 402, 404, 413, 501, 505])('does not retry permanent HTTP %s', async (status) => {
    fetch.mockImplementationOnce(() => Promise.resolve(createResponse(status)));

    const transport = createTransport();
    await transport.send([item]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('logs one payload-free permanent outcome', async () => {
    fetch.mockImplementationOnce(() => Promise.resolve(createResponse(400, undefined)));

    const logger = createMockLogger();
    const transport = createTransport({}, logger);

    await transport.send([item]);

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.any(String),
      'Permanent delivery failure',
      expect.objectContaining({
        status: 400,
        attempts: 1,
        elapsedTimeMs: expect.any(Number),
      })
    );
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain(item.payload.message);
  });

  it('logs one exhausted outcome after the final retryable response', async () => {
    jest.useFakeTimers();
    fetch.mockImplementation(() => Promise.resolve(createResponse(503, undefined)));

    const logger = createMockLogger();
    const transport = createTransport({ retry: { maxAttempts: 2, ...immediateRetry } }, logger);

    const sendPromise = transport.send([item]);
    await jest.advanceTimersByTimeAsync(2);
    await sendPromise;

    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.any(String),
      'Delivery retries exhausted',
      expect.objectContaining({
        status: 503,
        attempts: 2,
        elapsedTimeMs: expect.any(Number),
      })
    );
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain(item.payload.message);
  });
  it('starts a retry when its delay is below the remaining elapsed-time budget', async () => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    fetch
      .mockImplementationOnce(() => Promise.resolve(createResponse(503)))
      .mockImplementationOnce(() => Promise.resolve(createAcceptedResponse()));

    const transport = createTransport({
      retry: {
        maxAttempts: 2,
        initialBackoffMs: 999,
        maxBackoffMs: 999,
        backoffMultiplier: 1,
        maxElapsedTimeMs: 1000,
      },
    });

    const sendPromise = transport.send([item]);
    await jest.advanceTimersByTimeAsync(998);
    expect(fetch).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1);
    await sendPromise;
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('exhausts once when the retry delay equals the remaining elapsed-time budget', async () => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    fetch.mockImplementationOnce(() => Promise.resolve(createResponse(503)));

    const logger = createMockLogger();
    const transport = createTransport(
      {
        getNow: () => 0,
        retry: {
          maxAttempts: 2,
          initialBackoffMs: 1000,
          maxBackoffMs: 1000,
          backoffMultiplier: 1,
          maxElapsedTimeMs: 1000,
        },
      },
      logger
    );

    await transport.send([item]);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.any(String),
      'Delivery retries exhausted',
      expect.objectContaining({ status: 503, attempts: 1, elapsedTimeMs: 0 })
    );
  });

  it('rechecks the elapsed-time budget after retry transition before starting Fetch', async () => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    fetch.mockImplementationOnce(() => Promise.resolve(createResponse(503)));
    const retryClockReads = [0, 999, 1000];

    const logger = createMockLogger();
    const transport = createTransport(
      {
        getNow: () => (fetch.mock.calls.length === 0 ? 0 : (retryClockReads.shift() ?? 1000)),
        retry: {
          maxAttempts: 2,
          initialBackoffMs: 999,
          maxBackoffMs: 999,
          backoffMultiplier: 1,
          maxElapsedTimeMs: 1000,
        },
      },
      logger
    );

    const sendPromise = transport.send([item]);
    await jest.advanceTimersByTimeAsync(999);
    await sendPromise;

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.any(String),
      'Delivery retries exhausted',
      expect.objectContaining({ status: 503, attempts: 1, elapsedTimeMs: 1000 })
    );
  });

  it('classifies header resolution failures without attempting delivery', async () => {
    const headerError = new Error('Could not resolve authorization');
    const logger = createMockLogger();
    const transport = createTransport(
      {
        requestOptions: {
          headers: {
            Authorization: () => Promise.reject(headerError),
          },
        },
      },
      logger
    );

    await transport.send([item]);

    expect(fetch).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.any(String),
      'Permanent delivery failure',
      expect.objectContaining({
        error: headerError,
        attempts: 0,
        elapsedTimeMs: 0,
      })
    );
  });

  it.each<[string, Partial<FetchTransportRetryOptions>]>([
    ['maxAttempts below one', { maxAttempts: 0 }],
    ['non-integer maxAttempts', { maxAttempts: 1.5 }],
    ['maxAttempts above five', { maxAttempts: 6 }],
    ['non-positive initialBackoffMs', { initialBackoffMs: 0 }],
    ['non-positive maxBackoffMs', { maxBackoffMs: 0 }],
    ['maxBackoffMs below initialBackoffMs', { initialBackoffMs: 2, maxBackoffMs: 1 }],
    ['backoffMultiplier below one', { backoffMultiplier: 0.5 }],
    ['duplicate retryableStatusCodes', { retryableStatusCodes: [500, 500] }],
    ['non-error retryableStatusCodes', { retryableStatusCodes: [299] }],
    ['invalid retryableStatusCodes', { retryableStatusCodes: [600] }],
    ['non-positive requestTimeoutMs', { requestTimeoutMs: 0 }],
    ['non-finite maxElapsedTimeMs', { maxElapsedTimeMs: Number.POSITIVE_INFINITY }],
  ])('rejects invalid retry configuration: %s', (_name, retry) => {
    expect(() =>
      createTransport({
        retry,
      })
    ).toThrow('Invalid retry configuration');
  });

  it('aborts a stalled request when its timeout elapses', async () => {
    jest.useFakeTimers();

    let rejectFetch: ((reason?: unknown) => void) | undefined;
    fetch.mockImplementation(
      () =>
        new Promise<never>((_resolve, reject) => {
          rejectFetch = reject;
        })
    );

    const transport = createTransport({
      retry: {
        maxAttempts: 1,
        requestTimeoutMs: 10,
        maxElapsedTimeMs: 100,
      },
    });

    const sendPromise = transport.send([item]);
    await jest.advanceTimersByTimeAsync(0);

    const request = (fetch.mock.calls[0] as unknown[])[1] as RequestInit;
    request.signal?.addEventListener('abort', () => rejectFetch?.(request.signal?.reason));
    expect(request.signal).toBeDefined();

    await jest.advanceTimersByTimeAsync(10);
    await sendPromise;
    expect(request.signal?.aborted).toBe(true);
  });

  it('uses a fresh timeout signal for the generic retry', async () => {
    jest.useFakeTimers();

    const rejectFetches: Array<(reason?: unknown) => void> = [];
    fetch.mockImplementation(
      () =>
        new Promise<never>((_resolve, reject) => {
          rejectFetches.push(reject);
        })
    );

    const transport = createTransport({
      retry: {
        maxAttempts: 2,
        initialBackoffMs: 1,
        maxBackoffMs: 1,
        backoffMultiplier: 1,
        requestTimeoutMs: 10,
        maxElapsedTimeMs: 100,
      },
    });

    const sendPromise = transport.send([item]);
    await jest.advanceTimersByTimeAsync(0);

    const firstRequest = (fetch.mock.calls[0] as unknown[])[1] as RequestInit;
    firstRequest.signal?.addEventListener('abort', () => rejectFetches[0]?.(firstRequest.signal?.reason));
    await jest.advanceTimersByTimeAsync(11);

    const secondRequest = (fetch.mock.calls[1] as unknown[])[1] as RequestInit;
    secondRequest.signal?.addEventListener('abort', () => rejectFetches[1]?.(secondRequest.signal?.reason));
    await jest.advanceTimersByTimeAsync(10);
    await sendPromise;

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(firstRequest.signal).not.toBe(secondRequest.signal);
    expect(firstRequest.signal?.aborted).toBe(true);
    expect(secondRequest.signal?.aborted).toBe(true);
  });
  it('treats caller cancellation during an active request as terminal and debug-only', async () => {
    jest.useFakeTimers();
    let rejectFetch: ((reason?: unknown) => void) | undefined;
    fetch.mockImplementation(
      () =>
        new Promise<never>((_resolve, reject) => {
          rejectFetch = reject;
        })
    );

    const logger = createMockLogger();
    const abortController = new AbortController();
    const transport = createTransport({ requestOptions: { signal: abortController.signal } }, logger);

    const sendPromise = transport.send([item]);
    await jest.advanceTimersByTimeAsync(0);
    const request = (fetch.mock.calls[0] as unknown[])[1] as RequestInit;
    request.signal?.addEventListener('abort', () => rejectFetch?.(new TypeError('Failed to fetch')));

    abortController.abort();
    await sendPromise;

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      expect.any(String),
      'Delivery cancelled by caller',
      expect.objectContaining({ attempts: 1, elapsedTimeMs: expect.any(Number) })
    );
  });

  it('cancels a pending backoff when the caller aborts', async () => {
    jest.useFakeTimers();

    fetch.mockImplementation(() => Promise.resolve(createResponse(503, undefined)));

    const logger = createMockLogger();
    const abortController = new AbortController();
    const transport = createTransport(
      {
        requestOptions: {
          signal: abortController.signal,
        },
        retry: {
          maxAttempts: 2,
          initialBackoffMs: 1000,
          maxBackoffMs: 1000,
          backoffMultiplier: 1,
        },
      },
      logger
    );

    let completed = false;
    const sendPromise = transport.send([item]).then(() => {
      completed = true;
    });

    await jest.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledTimes(1);

    abortController.abort();
    await jest.advanceTimersByTimeAsync(0);

    expect(completed).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
    await sendPromise;
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      expect.any(String),
      'Delivery cancelled by caller',
      expect.objectContaining({
        attempts: 1,
        elapsedTimeMs: expect.any(Number),
      })
    );
  });

  it('will not sending events if buffer size is exhausted', () => {
    const transport = createTransport({
      bufferSize: 3,
    });

    for (let idx = 0; idx < 6; idx++) {
      transport.send([item]);
    }

    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('releases request capacity while a batch waits to retry', async () => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    fetch
      .mockImplementationOnce(() => Promise.resolve(createResponse(503)))
      .mockImplementationOnce(() => Promise.resolve(createAcceptedResponse()))
      .mockImplementationOnce(() => Promise.resolve(createAcceptedResponse()));

    const transport = createTransport({
      bufferSize: 1,
      concurrency: 1,
      retry: {
        maxAttempts: 2,
        initialBackoffMs: 100,
        maxBackoffMs: 100,
        backoffMultiplier: 1,
      },
    });

    const retainedBatch = transport.send([item]);
    await jest.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledTimes(1);

    await transport.send([mediumItem]);
    expect(fetch).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(100);
    await retainedBatch;
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('retains a retry when new requests fill the buffer', async () => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0.5);

    let resolveBlockingRequest!: (response: TestResponse) => void;
    fetch
      .mockImplementationOnce(() => Promise.resolve(createResponse(503)))
      .mockImplementationOnce(
        () =>
          new Promise<TestResponse>((resolve) => {
            resolveBlockingRequest = resolve;
          })
      )
      .mockImplementationOnce(() => Promise.resolve(createAcceptedResponse()));

    const transport = createTransport({
      bufferSize: 1,
      concurrency: 1,
      retry: {
        maxAttempts: 2,
        initialBackoffMs: 100,
        maxBackoffMs: 100,
        backoffMultiplier: 1,
      },
    });

    const retainedBatch = transport.send([item]);
    await jest.advanceTimersByTimeAsync(0);

    const blockingBatch = transport.send([mediumItem]);
    await jest.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(100);
    expect(fetch).toHaveBeenCalledTimes(2);

    resolveBlockingRequest(createAcceptedResponse());
    await Promise.all([retainedBatch, blockingBatch]);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('does not start a queued attempt after its elapsed-time budget expires', async () => {
    jest.useFakeTimers();

    let resolveBlockingRequest!: (response: TestResponse) => void;
    fetch
      .mockImplementationOnce(
        () =>
          new Promise<TestResponse>((resolve) => {
            resolveBlockingRequest = resolve;
          })
      )
      .mockImplementationOnce(() => Promise.resolve(createAcceptedResponse()));

    const transport = createTransport({
      bufferSize: 2,
      concurrency: 1,
      retry: {
        maxAttempts: 1,
        requestTimeoutMs: 100,
        maxElapsedTimeMs: 100,
      },
    });

    const blockingBatch = transport.send([item]);
    const queuedBatch = transport.send([mediumItem]);
    await jest.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(100);
    resolveBlockingRequest(createAcceptedResponse());
    await Promise.all([blockingBatch, queuedBatch]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('will back off on 429 for default interval if no retry-after header present', async () => {
    let now = Date.now();

    const transport = createTransport({
      defaultRateLimitBackoffMs: 1000,
      getNow: () => now,
      retry: {
        maxAttempts: 1,
      },
    });

    fetch.mockImplementationOnce(() => Promise.resolve(createResponse(429, '')));

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

    const transport = createTransport({
      defaultRateLimitBackoffMs: 1000,
      getNow: () => now,
      retry: {
        maxAttempts: 1,
      },
    });

    fetch.mockImplementationOnce(() => Promise.resolve(createResponse(429, '2')));

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

    const transport = createTransport({
      defaultRateLimitBackoffMs: 1000,
      getNow: () => now,
      retry: {
        maxAttempts: 1,
      },
    });

    fetch.mockImplementationOnce(() => Promise.resolve(createResponse(429, new Date(now + 3000).toUTCString())));

    await transport.send([item]);
    expect(fetch).toHaveBeenCalledTimes(1);

    now += 1001;
    await transport.send([item]);
    expect(fetch).toHaveBeenCalledTimes(1);

    now += 2001;
    await transport.send([item]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it.each([
    ['IMF-fixdate', 'Sun, 06 Nov 1994 08:49:37 GMT'],
    ['RFC 850', 'Sunday, 06-Nov-94 08:49:37 GMT'],
    ['asctime', 'Sun Nov  6 08:49:37 1994'],
  ])('honors %s Retry-After dates', async (_grammar, retryAfter) => {
    jest.useFakeTimers();
    const now = Date.UTC(1994, 10, 6, 8, 49, 36);
    fetch
      .mockImplementationOnce(() => Promise.resolve(createResponse(503, retryAfter)))
      .mockImplementationOnce(() => Promise.resolve(createAcceptedResponse()));

    const transport = createTransport({
      getNow: () => now,
      retry: { maxAttempts: 2, maxElapsedTimeMs: 5000 },
    });

    const sendPromise = transport.send([item]);
    await jest.advanceTimersByTimeAsync(999);
    expect(fetch).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1);
    await sendPromise;
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('interprets asctime Retry-After as GMT without host-local Date.parse behavior', async () => {
    jest.useFakeTimers();
    const now = Date.UTC(1994, 10, 6, 8, 49, 36);
    const dateParse = jest.spyOn(Date, 'parse').mockReturnValue(Date.UTC(1994, 10, 6, 13, 49, 37));
    fetch
      .mockImplementationOnce(() => Promise.resolve(createResponse(503, 'Sun Nov  6 08:49:37 1994')))
      .mockImplementationOnce(() => Promise.resolve(createAcceptedResponse()));

    const transport = createTransport({
      getNow: () => now,
      retry: { maxAttempts: 2, maxElapsedTimeMs: 5000 },
    });

    const sendPromise = transport.send([item]);
    await jest.advanceTimersByTimeAsync(999);
    expect(fetch).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1);
    await sendPromise;
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(dateParse).not.toHaveBeenCalled();
  });

  it('retries immediately for a valid Retry-After date in the past', async () => {
    jest.useFakeTimers();
    fetch
      .mockImplementationOnce(() => Promise.resolve(createResponse(503, 'Sun Nov  6 08:49:37 1994')))
      .mockImplementationOnce(() => Promise.resolve(createAcceptedResponse()));

    const transport = createTransport({
      getNow: () => Date.UTC(1994, 10, 6, 8, 49, 38),
      retry: { maxAttempts: 2 },
    });

    const sendPromise = transport.send([item]);
    await jest.advanceTimersByTimeAsync(0);
    await sendPromise;
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('resets exponential backoff after honoring Retry-After', async () => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0.5);

    fetch
      .mockImplementationOnce(() => Promise.resolve(createResponse(503, '1')))
      .mockImplementationOnce(() => Promise.resolve(createResponse(503, undefined)))
      .mockImplementationOnce(() => Promise.resolve(createAcceptedResponse()));

    const transport = createTransport({
      retry: {
        maxAttempts: 3,
        initialBackoffMs: 100,
        maxBackoffMs: 200,
        backoffMultiplier: 2,
        maxElapsedTimeMs: 5000,
      },
    });

    const sendPromise = transport.send([item]);
    await jest.advanceTimersByTimeAsync(1000);
    expect(fetch).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(99);
    expect(fetch).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(3);
    await sendPromise;
  });

  it('applies maxBackoffMs after jitter', async () => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(1);

    fetch
      .mockImplementationOnce(() => Promise.resolve(createResponse(503, undefined)))
      .mockImplementationOnce(() => Promise.resolve(createResponse(503, undefined)))
      .mockImplementationOnce(() => Promise.resolve(createAcceptedResponse()));

    const transport = createTransport({
      retry: {
        maxAttempts: 3,
        initialBackoffMs: 100,
        maxBackoffMs: 150,
        backoffMultiplier: 2,
      },
    });

    const sendPromise = transport.send([item]);
    await jest.advanceTimersByTimeAsync(120);
    expect(fetch).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(149);
    expect(fetch).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(3);
    await sendPromise;
  });

  it.each([
    'invalid',
    '-1',
    '1.5',
    '2000-01-01T00:00:00.000Z',
    'Sun Dec 99 00:00:00 2026',
    'Sun Feb 31 00:00:00 2026',
    'Sun, 31 Feb 2026 00:00:00 GMT',
    'Sunday, 31-Feb-26 00:00:00 GMT',
  ])(
    'uses exponential backoff for malformed Retry-After %s',
    async (value) => {
      jest.useFakeTimers();
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      fetch
        .mockImplementationOnce(() => Promise.resolve(createResponse(503, value)))
        .mockImplementationOnce(() => Promise.resolve(createAcceptedResponse()));

      const transport = createTransport({
        retry: {
          maxAttempts: 2,
          initialBackoffMs: 100,
          maxBackoffMs: 100,
          backoffMultiplier: 1,
        },
      });

      const sendPromise = transport.send([item]);
      await jest.advanceTimersByTimeAsync(99);
      expect(fetch).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(1);
      await sendPromise;
      expect(fetch).toHaveBeenCalledTimes(2);
    }
  );
  it.each([undefined, 'invalid'])(
    'uses bounded exponential backoff for 429 Retry-After %s',
    async (retryAfter) => {
      jest.useFakeTimers();
      jest.spyOn(Math, 'random').mockReturnValue(1);
      fetch
        .mockImplementationOnce(() => Promise.resolve(createResponse(429, retryAfter)))
        .mockImplementationOnce(() => Promise.resolve(createResponse(429, retryAfter)))
        .mockImplementationOnce(() => Promise.resolve(createAcceptedResponse()));

      const transport = createTransport({
        defaultRateLimitBackoffMs: 1000,
        retry: {
          maxAttempts: 3,
          initialBackoffMs: 100,
          maxBackoffMs: 150,
          backoffMultiplier: 2,
        },
      });

      const sendPromise = transport.send([item]);
      await jest.advanceTimersByTimeAsync(119);
      expect(fetch).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(1);
      expect(fetch).toHaveBeenCalledTimes(2);

      await jest.advanceTimersByTimeAsync(149);
      expect(fetch).toHaveBeenCalledTimes(2);

      await jest.advanceTimersByTimeAsync(1);
      await sendPromise;
      expect(fetch).toHaveBeenCalledTimes(3);
    }
  );

  it('exhausts delivery when Retry-After exceeds the remaining elapsed-time budget', async () => {
    jest.useFakeTimers();

    fetch.mockImplementationOnce(() => Promise.resolve(createResponse(503, '2')));

    const transport = createTransport({
      retry: {
        maxAttempts: 3,
        maxElapsedTimeMs: 1000,
      },
    });

    await transport.send([item]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('retries the rejected 429 batch while gating newly submitted batches', async () => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0.5);

    fetch
      .mockImplementationOnce(() => Promise.resolve(createResponse(429, undefined)))
      .mockImplementationOnce(() => Promise.resolve(createAcceptedResponse()));

    const transport = createTransport({
      defaultRateLimitBackoffMs: 100,
      retry: {
        maxAttempts: 2,
        initialBackoffMs: 100,
        maxBackoffMs: 100,
        backoffMultiplier: 1,
      },
    });

    const retainedBatch = transport.send([item]);
    await jest.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledTimes(1);

    await transport.send([item]);
    expect(fetch).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(100);
    await retainedBatch;
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('installs the 429 gate before the next queued request starts', async () => {
    jest.useFakeTimers();
    fetch
      .mockImplementationOnce(() => Promise.resolve(createResponse(429, '60')))
      .mockImplementationOnce(() => Promise.resolve(createAcceptedResponse()))
      .mockImplementationOnce(() => Promise.resolve(createAcceptedResponse()));

    const transport = createTransport({
      bufferSize: 2,
      concurrency: 1,
      retry: {
        maxAttempts: 2,
      },
    });

    const rateLimitedBatch = transport.send([item]);
    const queuedBatch = transport.send([mediumItem]);
    await jest.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(59_999);
    expect(fetch).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1);
    await Promise.all([rateLimitedBatch, queuedBatch]);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('honors a longer transport-wide Retry-After before an earlier batch retries', async () => {
    jest.useFakeTimers();
    fetch
      .mockImplementationOnce(() => Promise.resolve(createResponse(429, '1')))
      .mockImplementationOnce(() => Promise.resolve(createResponse(429, '60')))
      .mockImplementationOnce(() => Promise.resolve(createAcceptedResponse()))
      .mockImplementationOnce(() => Promise.resolve(createAcceptedResponse()));

    const transport = createTransport({
      bufferSize: 2,
      concurrency: 2,
      retry: {
        maxAttempts: 2,
      },
    });

    const firstBatch = transport.send([item]);
    const secondBatch = transport.send([mediumItem]);
    await jest.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(1000);
    expect(fetch).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(58_999);
    expect(fetch).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(1);
    await Promise.all([firstBatch, secondBatch]);
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('will turn off keepalive if the payload length is over 60_000', async () => {
    const transport = createTransport();

    transport.send([largeItem]);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('http://example.com/collect', {
      body: JSON.stringify(getTransportBody([largeItem])),
      headers: {
        'Content-Type': 'application/json',
        'x-faro-session-id': mockSessionId,
      },
      keepalive: false,
      signal: expect.any(AbortSignal),
      method: 'POST',
    });
  });

  it('will turn off keepalive if pending keepalive requests would exceed the body size limit', async () => {
    const pendingResponses: Array<(response: TestResponse) => void> = [];
    fetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          pendingResponses.push(resolve);
        })
    );

    const transport = createTransport({
      concurrency: 2,
    });

    const firstSend = transport.send([mediumItem]);
    const secondSend = transport.send([mediumItem]);

    expect(fetch).toHaveBeenCalledTimes(2);

    const firstCallArgs = fetch.mock.calls[0] as unknown[];
    const secondCallArgs = fetch.mock.calls[1] as unknown[];
    const firstRequestInit = firstCallArgs[1] as RequestInit;
    const secondRequestInit = secondCallArgs[1] as RequestInit;

    expect(firstRequestInit.keepalive).toBe(true);
    expect(secondRequestInit.keepalive).toBe(false);

    pendingResponses.forEach((resolve) => resolve(createAcceptedResponse()));
    await Promise.all([firstSend, secondSend]);
  });

  // The browser budget is a byte limit, so the reservation has to measure bytes rather than
  // UTF-16 code units. A CJK message is three bytes per code unit. See issue #1898.
  it('will turn off keepalive for a non-ASCII payload whose byte size is over 60_000', async () => {
    const nonAsciiItem: TransportItem<LogEvent> = {
      type: TransportItemType.LOG,
      payload: {
        context: {},
        level: LogLevel.INFO,
        // 25_000 code units, but 75_000 bytes once encoded as UTF-8
        message: '错'.repeat(25_000),
        timestamp: new Date().toISOString(),
      },
      meta: {
        session: { id: mockSessionId },
      },
    };

    const transport = createTransport();

    const jsonBody = JSON.stringify(getTransportBody([nonAsciiItem]));
    expect(jsonBody.length).toBeLessThan(60_000);
    expect(new TextEncoder().encode(jsonBody).byteLength).toBeGreaterThan(60_000);

    await transport.send([nonAsciiItem]);

    const requestInit = (fetch.mock.calls[0] as unknown[])[1] as RequestInit;
    expect(requestInit.keepalive).toBe(false);
  });

  it('will retry a failed keepalive request with keepalive disabled', async () => {
    fetch
      .mockImplementationOnce(() => Promise.reject(new TypeError('Failed to fetch')))
      .mockImplementationOnce(() => Promise.resolve(createAcceptedResponse()));

    const transport = createTransport();

    await transport.send([item]);

    expect(fetch).toHaveBeenCalledTimes(2);

    const firstCallArgs = fetch.mock.calls[0] as unknown[];
    const secondCallArgs = fetch.mock.calls[1] as unknown[];
    const firstRequestInit = firstCallArgs[1] as RequestInit;
    const secondRequestInit = secondCallArgs[1] as RequestInit;

    expect(firstRequestInit.keepalive).toBe(true);
    expect(secondRequestInit.keepalive).toBe(false);
  });

  it('does not retry after the keepalive fallback returns a retryable response', async () => {
    jest.useFakeTimers();

    fetch
      .mockImplementationOnce(() => Promise.reject(new TypeError('Failed to fetch')))
      .mockImplementationOnce(() => Promise.resolve(createResponse(503, undefined)));

    const transport = createTransport({
      retry: { maxAttempts: 2, ...immediateRetry },
    });

    const sendPromise = transport.send([item]);
    await jest.advanceTimersByTimeAsync(2);
    await sendPromise;

    expect(fetch).toHaveBeenCalledTimes(2);

    const requests = fetch.mock.calls.map((call) => (call as unknown[])[1] as RequestInit);
    expect(requests.map(({ keepalive }) => keepalive)).toEqual([true, false]);
    expect(requests[1]?.body).toBe(requests[0]?.body);
  });

  it('limits ambiguous keepalive failures to one retry', async () => {
    jest.useFakeTimers();
    fetch.mockImplementation(() => Promise.reject(new TypeError('Failed to fetch')));

    const transport = createTransport({
      retry: { maxAttempts: 5, ...immediateRetry },
    });

    const sendPromise = transport.send([item]);
    await jest.advanceTimersByTimeAsync(2);
    await sendPromise;

    expect(fetch).toHaveBeenCalledTimes(2);
    const requests = fetch.mock.calls.map((call) => (call as unknown[])[1] as RequestInit);
    expect(requests.map(({ keepalive }) => keepalive)).toEqual([true, false]);
  });

  it('stops after two logical attempts once delivery becomes ambiguous', async () => {
    jest.useFakeTimers();

    fetch
      .mockImplementationOnce(() => Promise.reject(new TypeError('Failed to fetch')))
      .mockImplementationOnce(() => Promise.resolve(createResponse(503, undefined)))
      .mockImplementationOnce(() => Promise.resolve(createAcceptedResponse()));

    const transport = createTransport({
      requestOptions: {
        keepalive: false,
      },
      retry: { maxAttempts: 5, ...immediateRetry },
    });

    const sendPromise = transport.send([item]);
    await jest.advanceTimersByTimeAsync(5);
    await sendPromise;

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('retains a complete non-keepalive body across retry', async () => {
    jest.useFakeTimers();

    fetch
      .mockImplementationOnce(() => Promise.resolve(createResponse(503, undefined)))
      .mockImplementationOnce(() => Promise.resolve(createAcceptedResponse()));

    const transport = createTransport({
      retry: { maxAttempts: 2, ...immediateRetry },
    });

    const sendPromise = transport.send([largeItem]);
    await jest.advanceTimersByTimeAsync(2);
    await sendPromise;

    const requests = fetch.mock.calls.map((call) => (call as unknown[])[1] as RequestInit);
    expect(requests).toHaveLength(2);
    expect(requests.map(({ keepalive }) => keepalive)).toEqual([false, false]);
    expect(requests[1]?.body).toBe(requests[0]?.body);
  });

  it('freezes compressed body, dynamic headers, and session identity across retry', async () => {
    jest.useFakeTimers();
    const getAuthorization = jest.fn(() => 'Bearer token');
    let resolveFirstFetch!: () => void;
    const firstFetch = new Promise<void>((resolve) => {
      resolveFirstFetch = resolve;
    });

    fetch
      .mockImplementationOnce(() => {
        resolveFirstFetch();
        return Promise.resolve(createResponse(503, undefined));
      })
      .mockImplementationOnce(() => Promise.resolve(createAcceptedResponse()));

    const transport = createTransport({
      requestCompression: true,
      requestOptions: {
        headers: {
          Authorization: getAuthorization,
        },
      },
      retry: { maxAttempts: 2, ...immediateRetry },
    });

    const sendPromise = transport.send([item]);
    await firstFetch;
    transport.metas.value = { session: { id: 'new-session' } };
    await jest.advanceTimersByTimeAsync(2);
    await sendPromise;

    const requests = fetch.mock.calls.map((call) => (call as unknown[])[1] as RequestInit);
    expect(requests).toHaveLength(2);
    expect(requests[0]?.body).toBeInstanceOf(Blob);
    expect(requests[1]?.body).toBe(requests[0]?.body);
    expect(requests[1]?.headers).toEqual(requests[0]?.headers);
    expect(requests[1]?.headers).toEqual(
      expect.objectContaining({
        Authorization: 'Bearer token',
        'x-faro-session-id': mockSessionId,
      })
    );
    expect(getAuthorization).toHaveBeenCalledTimes(1);
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

    const ignoreUrls = faro.transports.transports.flatMap((transport) => transport.getIgnoreUrls());
    expect(ignoreUrls).toStrictEqual([collectorUrl, ...globalIgnoreUrls]);
  });

  it('will add static header values', () => {
    const transport = createTransport({
      requestOptions: {
        headers: {
          Authorization: 'Bearer static-token',
          'X-Static': 'static-value',
        },
      },
    });

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

  it('will add dynamic header values from sync callbacks', async () => {
    const transport = createTransport({
      requestOptions: {
        headers: {
          Authorization: () => `Bearer ${mockSessionId}-token`,
          'X-User': () => 'user-123',
        },
      },
    });

    await transport.send([item]);

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

  it('will add static header values and dynamic header values from sync callbacks', async () => {
    const transport = createTransport({
      requestOptions: {
        headers: {
          Authorization: () => `Bearer ${mockSessionId}-token`,
          'X-Static': 'static-value',
        },
      },
    });

    await transport.send([item]);

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

  it('will add dynamic header values from async callbacks', async () => {
    const transport = createTransport({
      requestOptions: {
        headers: {
          Authorization: async () => Promise.resolve('Bearer async-token'),
          'X-Async': async () => Promise.resolve('async-value'),
        },
      },
    });

    await transport.send([item]);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      'http://example.com/collect',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer async-token',
          'X-Async': 'async-value',
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

    const transport = createTransport();

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

    const transport = createTransport();

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

  describe('requestCompression', () => {
    it('sends compressed body with Content-Encoding header when enabled', async () => {
      const transport = createTransport({
        requestCompression: true,
      });

      await transport.send([item]);

      expect(fetch).toHaveBeenCalledTimes(1);

      const callArgs = fetch.mock.calls[0] as unknown[];
      const requestInit = callArgs[1] as RequestInit;

      expect(requestInit.body).toBeInstanceOf(Blob);
      expect((requestInit.headers as Record<string, string>)['Content-Encoding']).toBe('gzip');
      expect((requestInit.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    });

    it('produces valid gzip that decompresses to the original JSON', async () => {
      const zlib = require('node:zlib');

      const transport = createTransport({
        requestCompression: true,
      });

      const jsonBody = JSON.stringify(getTransportBody([item]));
      const blob = await (transport as any).compress(jsonBody);

      // jsdom's Blob lacks arrayBuffer/stream — use FileReader to extract bytes
      const compressed = await new Promise<Buffer>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(Buffer.from(reader.result as ArrayBuffer));
        reader.readAsArrayBuffer(blob);
      });
      const decompressed = zlib.gunzipSync(compressed).toString('utf-8');

      expect(JSON.parse(decompressed)).toEqual(getTransportBody([item]));
    });

    it('is disabled by default', async () => {
      const transport = createTransport();

      await transport.send([item]);

      const callArgs = fetch.mock.calls[0] as unknown[];
      const requestInit = callArgs[1] as RequestInit;

      expect(typeof requestInit.body).toBe('string');
      expect((requestInit.headers as Record<string, string>)['Content-Encoding']).toBeUndefined();
    });

    it('falls back to uncompressed when CompressionStream is unavailable', async () => {
      const original = (global as any).CompressionStream;
      delete (global as any).CompressionStream;

      try {
        const transport = createTransport({
          requestCompression: true,
        });

        await transport.send([item]);

        const callArgs = fetch.mock.calls[0] as unknown[];
        const requestInit = callArgs[1] as RequestInit;

        expect(typeof requestInit.body).toBe('string');
        expect((requestInit.headers as Record<string, string>)['Content-Encoding']).toBeUndefined();
      } finally {
        (global as any).CompressionStream = original;
      }
    });

    it('disables compression when CompressionStream is unavailable', () => {
      const original = (global as any).CompressionStream;
      delete (global as any).CompressionStream;

      try {
        const transport = createTransport({
          requestCompression: true,
        });

        expect((transport as any).compressionEnabled).toBe(false);
      } finally {
        (global as any).CompressionStream = original;
      }
    });

    it('enables keepalive for large payloads that compress below the threshold', async () => {
      const transport = createTransport({
        requestCompression: true,
      });

      await transport.send([largeItem]);

      const callArgs = fetch.mock.calls[0] as unknown[];
      const requestInit = callArgs[1] as RequestInit;
      const blob = requestInit.body as Blob;

      expect(blob.size).toBeLessThan(60000);
      expect(requestInit.keepalive).toBe(true);
    });
  });
});
