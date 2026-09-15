import { type Faro, initializeFaro, type TransportItem, TransportItemType } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

import { FetchTransport } from './transport';

const originalFetch = globalThis.fetch;
const fetchMock = jest.fn();
const response = (status: number) => ({ status, headers: { get: () => null }, text: async () => '' });
const item: TransportItem = {
  type: TransportItemType.EVENT,
  meta: { session: { id: 'A' } },
  payload: { name: 'lifecycle', timestamp: new Date(0).toISOString() },
};
let sdk: Faro;

beforeEach(() => {
  jest.useFakeTimers();
  fetchMock.mockReset().mockResolvedValue(response(202));
  globalThis.fetch = fetchMock;
  sdk = initializeFaro(mockConfig());
});

afterEach(() => {
  sdk.transports.remove(...sdk.transports.transports);
  jest.restoreAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
  globalThis.fetch = originalFetch;
});

it('removes named lifecycle listeners and ignores an old callback already selected for delivery', async () => {
  const add = jest.spyOn(window, 'addEventListener');
  const remove = jest.spyOn(window, 'removeEventListener');
  const transport = new FetchTransport({
    url: '/collect',
    requestTimeoutMs: 0,
    retry: { initialBackoffMs: 20 },
    getRandom: () => 0,
  });
  sdk.transports.add(transport);
  const listeners = add.mock.calls.filter(([name]) => name === 'pagehide' || name === 'pageshow');
  expect(listeners).toHaveLength(2);
  const oldHide = listeners.find(([name]) => name === 'pagehide')![1] as EventListener;
  fetchMock.mockResolvedValueOnce(response(503));
  const sending = transport.send([item]);
  await jest.advanceTimersByTimeAsync(0);
  sdk.transports.remove(transport);
  for (const [name, listener] of listeners) {
    expect(remove).toHaveBeenCalledWith(name, listener);
  }
  oldHide(new Event('pagehide'));
  window.dispatchEvent(new Event('pagehide'));
  await jest.advanceTimersByTimeAsync(0);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(20);
  await sending;
  expect(fetchMock).toHaveBeenCalledTimes(2);

  sdk.transports.add(transport);
  expect(add.mock.calls.filter(([name]) => name === 'pagehide' || name === 'pageshow')).toHaveLength(4);
  fetchMock.mockResolvedValueOnce(response(503));
  const resumed = transport.send([item]);
  await jest.advanceTimersByTimeAsync(0);
  window.dispatchEvent(new Event('pagehide'));
  await jest.advanceTimersByTimeAsync(0);
  await resumed;
  expect(fetchMock).toHaveBeenCalledTimes(4);
});

it('unwinds partially installed native listeners when construction fails', () => {
  const addListener = window.addEventListener;
  const remove = jest.spyOn(window, 'removeEventListener');
  jest.spyOn(window, 'addEventListener').mockImplementation((name, listener, options) => {
    if (name === 'pageshow') {
      throw new Error('registration failed');
    }
    addListener.call(window, name, listener, options);
  });
  expect(() => new FetchTransport({ url: '/collect' })).toThrow('registration failed');
  expect(remove).toHaveBeenCalledWith('pagehide', expect.any(Function));
});

it('resumes normal delivery when re-added after restoration happened while removed', async () => {
  const transport = new FetchTransport({
    url: '/collect',
    requestTimeoutMs: 0,
    retry: { initialBackoffMs: 20 },
    getRandom: () => 0,
  });
  sdk.transports.add(transport);
  window.dispatchEvent(new Event('pagehide'));
  sdk.transports.remove(transport);
  window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  sdk.transports.add(transport);
  fetchMock.mockResolvedValueOnce(response(503));
  const sending = transport.send([item]);
  await jest.advanceTimersByTimeAsync(20);
  await sending;
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('calls a subclass initialization hook after construction and SDK configuration', () => {
  const initialized = jest.fn();
  class CustomFetch extends FetchTransport {
    private ready = true;
    override initialize(): void {
      expect(this.ready).toBe(true);
      expect(this.config).toBe(sdk.config);
      initialized();
      super.initialize();
    }
  }
  const transport = new CustomFetch({ url: '/collect' });
  expect(initialized).not.toHaveBeenCalled();
  sdk.transports.add(transport);
  expect(initialized).toHaveBeenCalledTimes(1);
});
