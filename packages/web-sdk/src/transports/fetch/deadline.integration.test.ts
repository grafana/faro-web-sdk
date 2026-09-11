import {
  type LogEvent,
  LogLevel,
  type PromiseProducer,
  type TransportItem,
  TransportItemType,
} from '@grafana/faro-core';
import { mockInternalLogger } from '@grafana/faro-core/src/testUtils';

import { FetchTransport } from './transport';
import type { FetchTransportOptions } from './types';

const originalFetch = globalThis.fetch;
const fetchMock = jest.fn();
const transports: FetchTransport[] = [];
type TestResponse = Pick<Response, 'status' | 'text'> & { headers: Pick<Headers, 'get'> };
const accepted = (): TestResponse => ({ status: 202, headers: { get: () => null }, text: async () => '' });
const item: TransportItem<LogEvent> = {
  type: TransportItemType.LOG,
  payload: { level: LogLevel.INFO, message: 'hello', timestamp: new Date(0).toISOString(), context: {} },
  meta: { session: { id: 'A' } },
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((accept, decline) => {
    resolve = accept;
    reject = decline;
  });
  return { promise, resolve, reject };
}

function createTransport(options: Partial<FetchTransportOptions> = {}) {
  const transport = new FetchTransport({ url: 'https://collector.test/collect', requestTimeoutMs: 10, ...options });
  transports.push(transport);
  transport.internalLogger = { ...mockInternalLogger, error: jest.fn() };
  return transport;
}

beforeEach(() => {
  jest.useFakeTimers();
  fetchMock.mockReset().mockResolvedValue(accepted());
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  for (const transport of transports.splice(0)) {
    transport.destroy();
  }
  jest.restoreAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
  globalThis.fetch = originalFetch;
});

it('ends a hung header at the send deadline, frees admission, and rejects its late continuation', async () => {
  const pending = deferred<string>();
  const authorization = jest.fn().mockReturnValueOnce(pending.promise).mockReturnValue('ready');
  const laterHeader = jest.fn(() => 'later');
  const transport = createTransport({
    bufferSize: 1,
    requestOptions: { headers: { Authorization: authorization, Later: laterHeader } },
  });
  let completed = false;
  const sending = transport.send([item]).then(() => {
    completed = true;
  });
  await jest.advanceTimersByTimeAsync(9);
  expect(completed).toBe(false);
  await jest.advanceTimersByTimeAsync(1);
  expect(completed).toBe(true);
  await sending;
  expect(laterHeader).not.toHaveBeenCalled();
  expect(fetchMock).not.toHaveBeenCalled();

  await transport.send([item]);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  pending.resolve('too late');
  await jest.advanceTimersByTimeAsync(0);
  expect(laterHeader).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('includes custom scheduling and refuses abandoned producers forwarded through the original buffer', async () => {
  const transport = createTransport({ bufferSize: 1, concurrency: 1 });
  const original = transport.promiseBuffer;
  const scheduled = deferred<Response | void>();
  let producer!: PromiseProducer<Response | void>;
  transport.promiseBuffer = {
    add: (next) => {
      producer = next;
      return scheduled.promise;
    },
  };
  let completed = false;
  const sending = transport.send([item]).then(() => {
    completed = true;
  });
  await jest.advanceTimersByTimeAsync(10);
  expect(completed).toBe(true);
  await sending;
  expect(fetchMock).not.toHaveBeenCalled();
  transport.promiseBuffer = original;
  await expect(original.add(producer)).rejects.toThrow('deadline');
  scheduled.resolve(undefined);
  await transport.send([item]);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('frees a timed-out fetch worker even when fetch ignores abort and ignores its late response', async () => {
  const pending = deferred<ReturnType<typeof accepted>>();
  fetchMock.mockImplementationOnce(() => pending.promise);
  const transport = createTransport({ bufferSize: 2, concurrency: 1 });
  let firstDone = false;
  let secondDone = false;
  const first = transport.send([item]).then(() => {
    firstDone = true;
  });
  await jest.advanceTimersByTimeAsync(5);
  const second = transport.send([item]).then(() => {
    secondDone = true;
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(5);
  expect(firstDone).toBe(true);
  expect(secondDone).toBe(true);
  await Promise.all([first, second]);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls[0]![1].signal.aborted).toBe(true);
  const getStatus = jest.fn(() => 'invalid');
  pending.resolve({ ...accepted(), headers: { get: getStatus } });
  await jest.advanceTimersByTimeAsync(0);
  expect(getStatus).not.toHaveBeenCalled();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('leaves only the original remaining budget after header preparation', async () => {
  const header = deferred<string>();
  fetchMock.mockImplementation(() => new Promise(() => {}));
  const transport = createTransport({ requestOptions: { headers: { Authorization: () => header.promise } } });
  let completed = false;
  const sending = transport.send([item]).then(() => {
    completed = true;
  });
  await jest.advanceTimersByTimeAsync(8);
  header.resolve('ready');
  await jest.advanceTimersByTimeAsync(0);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(1);
  expect(completed).toBe(false);
  await jest.advanceTimersByTimeAsync(1);
  expect(completed).toBe(true);
  await sending;
});

it('includes compression in the remaining preparation budget and discards its late output', async () => {
  const { ReadableStream, TransformStream } = require('node:stream/web');
  const originalReadable = globalThis.ReadableStream;
  const originalCompression = globalThis.CompressionStream;
  const header = deferred<string>();
  const compression = deferred<void>();
  const compress = jest.fn(
    () =>
      new TransformStream({
        transform: async (chunk: Uint8Array, controller: TransformStreamDefaultController<Uint8Array>) => {
          await compression.promise;
          controller.enqueue(chunk);
        },
      })
  );
  Object.assign(globalThis, { ReadableStream, CompressionStream: compress });
  try {
    const transport = createTransport({
      bufferSize: 1,
      requestCompression: true,
      requestOptions: { headers: { Authorization: () => header.promise } },
    });
    let completed = false;
    const sending = transport.send([item]).then(() => {
      completed = true;
    });
    await jest.advanceTimersByTimeAsync(8);
    header.resolve('ready');
    await jest.advanceTimersByTimeAsync(0);
    expect(compress).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(2);
    expect(completed).toBe(true);
    await sending;
    await expect(transport.promiseBuffer.add(async () => {})).resolves.toBeUndefined();
    compression.resolve(undefined);
    await jest.advanceTimersByTimeAsync(0);
    expect(fetchMock).not.toHaveBeenCalled();
  } finally {
    globalThis.ReadableStream = originalReadable;
    globalThis.CompressionStream = originalCompression;
  }
});

it.each(['header', 'fetch'])('cancels %s work from the caller even with the SDK deadline disabled', async (stage) => {
  const controller = new AbortController();
  const header = deferred<string>();
  const response = deferred<ReturnType<typeof accepted>>();
  if (stage === 'fetch') {
    fetchMock.mockImplementationOnce(() => response.promise);
  }
  const laterHeader = jest.fn(() => 'later');
  const transport = createTransport({
    requestTimeoutMs: 0,
    requestOptions: {
      signal: controller.signal,
      headers: { First: () => (stage === 'header' ? header.promise : 'ready'), Later: laterHeader },
    },
  });
  let completed = false;
  const sending = transport.send([item]).then(() => {
    completed = true;
  });
  await jest.advanceTimersByTimeAsync(0);
  controller.abort(new Error('caller cancelled'));
  await jest.advanceTimersByTimeAsync(0);
  expect(completed).toBe(true);
  await sending;
  header.resolve('late');
  response.resolve(accepted());
  await jest.advanceTimersByTimeAsync(0);
  expect(laterHeader).toHaveBeenCalledTimes(stage === 'header' ? 0 : 1);
  expect(fetchMock).toHaveBeenCalledTimes(stage === 'header' ? 0 : 1);
});

it.each(['deadline', 'caller'])(
  'cancels backoff at the %s boundary and prevents a later unload flush',
  async (boundary) => {
    const controller = new AbortController();
    fetchMock.mockResolvedValue({ ...accepted(), status: 503 });
    const transport = createTransport({
      requestTimeoutMs: boundary === 'deadline' ? 10 : 0,
      requestOptions: { signal: controller.signal, keepalive: false },
      retry: { initialBackoffMs: 20 },
      getRandom: () => 0,
    });
    let completed = false;
    const sending = transport.send([item]).then(() => {
      completed = true;
    });
    await jest.advanceTimersByTimeAsync(10);
    if (boundary === 'caller') {
      controller.abort();
      await jest.advanceTimersByTimeAsync(0);
    }
    expect(completed).toBe(true);
    await sending;
    window.dispatchEvent(new Event('pagehide'));
    await jest.advanceTimersByTimeAsync(50);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  }
);

it('gives keepalive fallback only the remaining send budget', async () => {
  const first = deferred<ReturnType<typeof accepted>>();
  fetchMock.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => new Promise(() => {}));
  const transport = createTransport();
  let completed = false;
  const sending = transport.send([item]).then(() => {
    completed = true;
  });
  await jest.advanceTimersByTimeAsync(8);
  first.reject(new TypeError('keepalive failed'));
  await jest.advanceTimersByTimeAsync(0);
  expect(fetchMock.mock.calls.map(([, init]) => init.keepalive)).toEqual([true, false]);
  await jest.advanceTimersByTimeAsync(2);
  expect(completed).toBe(true);
  await sending;
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('rechecks the budget after synchronous application work before running another stage', async () => {
  const pending = deferred<string>();
  const later = jest.fn(() => 'later');
  const transport = createTransport({
    requestOptions: {
      headers: {
        First: () => {
          jest.setSystemTime(Date.now() + 10);
          return pending.promise;
        },
        Later: later,
      },
    },
  });
  await transport.send([item]);
  expect(later).not.toHaveBeenCalled();
  expect(fetchMock).not.toHaveBeenCalled();
  pending.reject(new Error('abandoned header failed later'));
  await jest.advanceTimersByTimeAsync(0);
});

it('enforces the SDK deadline even when AbortController is unavailable', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'AbortController')!;
  Object.defineProperty(globalThis, 'AbortController', { configurable: true, value: undefined });
  try {
    fetchMock.mockImplementationOnce(() => new Promise(() => {}));
    const transport = createTransport({ bufferSize: 1, concurrency: 1 });
    let completed = false;
    const sending = transport.send([item]).then(() => {
      completed = true;
    });
    await jest.advanceTimersByTimeAsync(10);
    expect(completed).toBe(true);
    await sending;
    await transport.send([item]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  } finally {
    Object.defineProperty(globalThis, 'AbortController', descriptor);
  }
});

it.each([0, -1])('disables only the SDK timer when requestTimeoutMs is %s', async (requestTimeoutMs) => {
  const response = deferred<ReturnType<typeof accepted>>();
  fetchMock.mockImplementationOnce(() => response.promise);
  const transport = createTransport({ requestTimeoutMs });
  let completed = false;
  const sending = transport.send([item]).then(() => {
    completed = true;
  });
  await jest.advanceTimersByTimeAsync(20_000);
  expect(completed).toBe(false);
  response.resolve(accepted());
  await sending;
  expect(completed).toBe(true);
});

it('keeps reserved identity headers authoritative regardless of custom header casing', async () => {
  const override = jest.fn(() => 'wrong');
  const transport = createTransport({
    requestOptions: {
      headers: {
        'X-FARO-SESSION-ID': override,
        'idempotency-key': override,
        'IDEMPOTENCY-KEY': 'also-wrong',
        'x-faro-session-id': 'another-session',
        Custom: 'kept',
      },
    },
  });
  await transport.send([item]);
  const headers = fetchMock.mock.calls[0]![1].headers as Record<string, string>;
  expect(Object.keys(headers).filter((name) => name.toLowerCase() === 'x-faro-session-id')).toEqual([
    'x-faro-session-id',
  ]);
  expect(Object.keys(headers).filter((name) => name.toLowerCase() === 'idempotency-key')).toEqual(['Idempotency-Key']);
  expect(headers['x-faro-session-id']).toBe('A');
  expect(headers['Idempotency-Key']).not.toBe('wrong');
  expect(headers['Custom']).toBe('kept');
  expect(override).not.toHaveBeenCalled();
});
