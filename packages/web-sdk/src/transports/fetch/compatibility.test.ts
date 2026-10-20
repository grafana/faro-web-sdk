import { type LogEvent, LogLevel, type TransportItem, TransportItemType } from '@grafana/faro-core';
import { mockInternalLogger } from '@grafana/faro-core/src/testUtils';

import {
  type ClockFn,
  FetchTransport,
  type FetchTransportOptions,
  type FetchTransportRequestOptions,
} from '../../index';

const { ReadableStream: NodeReadableStream, CompressionStream: NodeCompressionStream } = require('node:stream/web');

const originalFetch = globalThis.fetch;
const originalCompressionStream = globalThis.CompressionStream;
const originalReadableStream = globalThis.ReadableStream;
const accepted = () => ({ status: 202, headers: { get: () => null }, text: async () => '' });
const fetchMock = jest.fn();
const item: TransportItem<LogEvent> = {
  type: TransportItemType.LOG,
  payload: { level: LogLevel.INFO, message: 'hello', timestamp: '2026-09-08T12:00:00Z', context: {} },
  meta: { session: { id: 'session' } },
};

function createTransport(options: Partial<FetchTransportOptions> = {}): FetchTransport {
  const transport = new FetchTransport({ url: 'https://collector.test/collect', requestTimeoutMs: 0, ...options });
  transport.internalLogger = mockInternalLogger;
  transport.metas.value = item.meta;
  transport.config = { ignoreUrls: ['https://also-ignored.test'] } as typeof transport.config;
  return transport;
}

beforeEach(() => {
  jest.clearAllMocks();
  fetchMock.mockReset().mockResolvedValue(accepted());
  globalThis.fetch = fetchMock;
  globalThis.ReadableStream = NodeReadableStream;
  globalThis.CompressionStream = NodeCompressionStream;
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
  globalThis.fetch = originalFetch;
  globalThis.CompressionStream = originalCompressionStream;
  globalThis.ReadableStream = originalReadableStream;
});

it('preserves the public constructor, name, existing options and dynamic headers', async () => {
  const getNow: ClockFn = () => Date.now();
  const requestOptions: FetchTransportRequestOptions = {
    credentials: 'include',
    keepalive: false,
    headers: { static: 'value', sync: () => 'sync', async: async () => 'async' },
  };
  const options: FetchTransportOptions = {
    url: 'https://collector.test/collect',
    apiKey: 'test-key',
    bufferSize: 10,
    concurrency: 2,
    defaultRateLimitBackoffMs: 250,
    getNow,
    requestOptions,
    requestCompression: false,
  };
  const transport = createTransport(options);
  await transport.send([item]);

  expect(transport.name).toBe('@grafana/faro-web-sdk:transport-fetch');
  expect(transport.getIgnoreUrls()).toEqual(['https://collector.test/collect', 'https://also-ignored.test']);
  expect(fetchMock).toHaveBeenCalledWith(
    options.url,
    expect.objectContaining({
      credentials: 'include',
      keepalive: false,
      headers: expect.objectContaining({
        static: 'value',
        sync: 'sync',
        async: 'async',
        'x-api-key': 'test-key',
        'x-faro-session-id': 'session',
        'Idempotency-Key': expect.any(String),
      }),
    })
  );
});

it.each([
  { legacy: 100, explicit: undefined, delay: 100 },
  { legacy: 1000, explicit: 25, delay: 25 },
])(
  'uses the deprecated backoff alias, with explicit retry settings taking precedence: %j',
  async ({ legacy, explicit, delay }) => {
    jest.useFakeTimers();
    fetchMock.mockResolvedValueOnce({ ...accepted(), status: 429 });
    const transport = createTransport({
      defaultRateLimitBackoffMs: legacy,
      retry: { maxAttempts: 2, initialBackoffMs: explicit },
      getRandom: () => 0,
    });
    const sending = transport.send([item]);
    await jest.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(delay - 1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    await sending;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  }
);

it('shares promiseBuffer admission with delivery and releases it after direct work', async () => {
  const transport = createTransport({ bufferSize: 1 });
  let release!: () => void;
  const pending = transport.promiseBuffer.add(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      })
  );
  expect(() => transport.promiseBuffer.add(async () => {})).toThrow('Task buffer full');
  await transport.send([item]);
  expect(fetchMock).not.toHaveBeenCalled();
  release();
  await pending;
  await transport.send([item]);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('shares promiseBuffer concurrency with delivery attempts', async () => {
  const transport = createTransport({ bufferSize: 2, concurrency: 1 });
  let release!: () => void;
  const pending = transport.promiseBuffer.add(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      })
  );
  const sending = transport.send([item]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(fetchMock).not.toHaveBeenCalled();
  release();
  await pending;
  await sending;
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('returns direct promiseBuffer results and rejects failed tasks without retrying', async () => {
  const transport = createTransport({ bufferSize: 1 });
  const response = accepted() as unknown as Response;
  await expect(transport.promiseBuffer.add(async () => response)).resolves.toBe(response);
  const failure = new Error('custom task failed');
  const producer = jest.fn(async () => {
    throw failure;
  });
  await expect(transport.promiseBuffer.add(producer)).rejects.toBe(failure);
  expect(producer).toHaveBeenCalledTimes(1);
  await transport.send([item]);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('preserves wrappers and replacements of the public promiseBuffer', async () => {
  const transport = createTransport({ bufferSize: 1, concurrency: 1 });
  const original = transport.promiseBuffer;
  const add = jest.fn((producer) => original.add(producer));
  transport.promiseBuffer = { add };
  await transport.send([item]);
  expect(add).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  transport.promiseBuffer = {
    add: () => {
      throw new Error('custom queue full');
    },
  };
  await transport.send([item]);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  transport.promiseBuffer = original;
  await transport.send([item]);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('honors in-place decorators and admission policies on promiseBuffer.add', async () => {
  const transport = createTransport({ bufferSize: 1, concurrency: 1 });
  const originalAdd = transport.promiseBuffer.add;
  const decorator = jest.fn((producer) => originalAdd(() => producer()));
  transport.promiseBuffer.add = decorator;
  await transport.send([item]);
  expect(decorator).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledTimes(1);

  transport.promiseBuffer.add = () => {
    throw new Error('custom admission policy');
  };
  await transport.send([item]);
  expect(fetchMock).toHaveBeenCalledTimes(1);

  transport.promiseBuffer.add = originalAdd;
  await transport.send([item]);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it.each([
  { bufferSize: 1, asynchronous: false, restore: false },
  { bufferSize: 2, asynchronous: false, restore: false },
  { bufferSize: 1, asynchronous: true, restore: false },
  { bufferSize: 2, asynchronous: true, restore: false },
  { bufferSize: 1, asynchronous: true, restore: true },
])(
  'supports transformed and delayed buffer decorators without double admission: %j',
  async ({ bufferSize, asynchronous, restore }) => {
    const transport = createTransport({ bufferSize, concurrency: 1 });
    const original = transport.promiseBuffer;
    transport.promiseBuffer = {
      add: async (producer) => {
        if (asynchronous) {
          await Promise.resolve();
        }
        if (restore) {
          transport.promiseBuffer = original;
        }
        return original.add(async () => producer());
      },
    };

    await transport.send([item]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await transport.send([item]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  }
);

it('budgets keepalive using UTF-8 bytes', async () => {
  const transport = createTransport();
  await transport.send([{ ...item, payload: { ...item.payload, message: '界'.repeat(25_000) } }]);
  expect(fetchMock.mock.calls[0][1].keepalive).toBe(false);
});

it('shares the pending keepalive byte budget across transport instances', async () => {
  let finish!: (response: ReturnType<typeof accepted>) => void;
  fetchMock.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const medium = { ...item, payload: { ...item.payload, message: 'a'.repeat(40_000) } };
  const first = createTransport().send([medium]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await createTransport().send([medium]);
  expect(fetchMock.mock.calls.map(([, init]) => init.keepalive)).toEqual([true, false]);
  finish(accepted());
  await first;
});

it('sends valid gzip and uses compressed size for keepalive', async () => {
  const transport = createTransport({ requestCompression: true });
  await transport.send([{ ...item, payload: { ...item.payload, message: 'a'.repeat(70_000) } }]);
  const init = fetchMock.mock.calls[0][1];
  expect(init.headers['Content-Encoding']).toBe('gzip');
  expect(init.keepalive).toBe(true);
  const compressed = await new Promise<ArrayBuffer>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.readAsArrayBuffer(init.body);
  });
  const body = JSON.parse(require('node:zlib').gunzipSync(Buffer.from(compressed)).toString());
  expect(body.logs[0].message).toBe('a'.repeat(70_000));
});

it('falls back to plain JSON when CompressionStream is unavailable', async () => {
  Object.defineProperty(globalThis, 'CompressionStream', { configurable: true, writable: true, value: undefined });
  await createTransport({ requestCompression: true }).send([item]);
  const init = fetchMock.mock.calls[0][1];
  expect(init.headers['Content-Encoding']).toBeUndefined();
  expect(JSON.parse(init.body).logs[0].message).toBe('hello');
});
