import {
  type Config,
  dateNow,
  EVENT_SESSION_EXTEND,
  type EventEvent,
  type Faro,
  initializeFaro,
  type TransportItem,
} from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { makeCoreConfig } from '../../config/makeCoreConfig';
import { FetchTransport } from '../../transports/fetch/transport';

import { SessionInstrumentation } from './instrumentation';
import { type FaroUserSession, SESSION_INACTIVITY_TIME, STORAGE_KEY } from './sessionManager';
import { createUserSessionObject } from './sessionManager/sessionManagerUtils';

const originalFetch = globalThis.fetch;

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-09-07T12:00:00Z'));
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
  globalThis.fetch = originalFetch;
  window.localStorage.clear();
  window.sessionStorage.clear();
});

function stored(persistent: boolean): FaroUserSession {
  return JSON.parse((persistent ? window.localStorage : window.sessionStorage).getItem(STORAGE_KEY)!);
}

function events(transport: MockTransport): Array<TransportItem<EventEvent>> {
  return transport.items as Array<TransportItem<EventEvent>>;
}

function setup(persistent: boolean, batched = true, beforeSend?: Config['beforeSend'], samplingRate = 1) {
  const transport = new MockTransport();
  const faro = initializeFaro(
    makeCoreConfig(
      mockConfig({
        transports: [transport],
        batching: { enabled: batched },
        beforeSend,
        instrumentations: [new SessionInstrumentation()],
        sessionTracking: { enabled: true, persistent, samplingRate },
      })
    )!
  );
  jest.advanceTimersByTime(250);
  transport.items.length = 0;
  return { faro, transport };
}

describe.each([true, false])('accepted activity with persistent=%s', (persistent) => {
  it.each([true, false])(
    'does not change sessions while paused and delivers renewal after unpause (batched=%s)',
    (batched) => {
      const { faro, transport } = setup(persistent, batched);
      const initial = stored(persistent);
      faro.pause();
      jest.advanceTimersByTime(SESSION_INACTIVITY_TIME + 1000);
      faro.api.pushEvent('while-paused');
      expect(stored(persistent)).toEqual(initial);
      expect(transport.items).toEqual([]);

      faro.unpause();
      faro.api.pushEvent('after-unpause');
      jest.advanceTimersByTime(250);
      const renewedId = faro.api.getSession()?.id;
      expect(renewedId).not.toBe(initial.sessionId);
      expect(events(transport).map((item) => [item.payload.name, item.meta.session?.id])).toEqual([
        [EVENT_SESSION_EXTEND, renewedId],
        ['after-unpause', renewedId],
      ]);
    }
  );

  it('honors the configured filter while preserving later-hook activity ordering', () => {
    const { faro, transport } = setup(persistent, true, (item) =>
      'name' in item.payload && item.payload.name === 'filtered' ? null : item
    );
    const initial = stored(persistent);
    jest.advanceTimersByTime(2000);
    faro.api.pushEvent('filtered');
    jest.advanceTimersByTime(250);
    expect(stored(persistent).lastActivity).toBe(initial.lastActivity);

    const reject = () => null;
    faro.transports.addBeforeSendHooks(reject);
    jest.advanceTimersByTime(2000);
    faro.api.pushEvent('late-filtered');
    jest.advanceTimersByTime(250);
    const activityBeforeLateRejection = stored(persistent).lastActivity;
    expect(activityBeforeLateRejection).toBeGreaterThan(initial.lastActivity);
    expect(transport.items).toEqual([]);

    faro.transports.removeBeforeSendHooks(reject);
    jest.advanceTimersByTime(2000);
    faro.api.pushEvent('accepted');
    jest.advanceTimersByTime(250);
    expect(stored(persistent).lastActivity).toBeGreaterThan(activityBeforeLateRejection);
    expect(events(transport).map((item) => item.payload.name)).toEqual(['accepted']);
  });

  it('does no session work for deduplicated submissions', () => {
    const { faro, transport } = setup(persistent);
    faro.api.pushEvent('same');
    jest.advanceTimersByTime(250);
    const initial = stored(persistent);
    transport.items.length = 0;
    const get = jest.spyOn(Storage.prototype, 'getItem');
    const set = jest.spyOn(Storage.prototype, 'setItem');
    for (let minute = 0; minute < 16; minute++) {
      jest.advanceTimersByTime(60_000);
      faro.api.pushEvent('same');
    }
    expect(get).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
    expect(transport.items).toEqual([]);
    expect(stored(persistent).lastActivity).toBe(initial.lastActivity);

    faro.api.pushEvent('different');
    jest.advanceTimersByTime(250);
    expect(faro.api.getSession()?.id).not.toBe(initial.sessionId);
    expect(events(transport)[0]?.payload.name).toBe(EVENT_SESSION_EXTEND);
  });

  it('bounds storage work for a burst of accepted events in a stable session', () => {
    const { faro } = setup(persistent);
    jest.advanceTimersByTime(2000);
    const get = jest.spyOn(Storage.prototype, 'getItem');
    const set = jest.spyOn(Storage.prototype, 'setItem');
    for (let i = 0; i < 1000; i++) {
      faro.api.pushEvent(`accepted-${i}`);
    }
    expect(get.mock.calls.length).toBeLessThanOrEqual(2);
    expect(set).toHaveBeenCalledTimes(1);
    expect(stored(persistent).lastActivity).toBe(dateNow());
  });

  it('allows expiry rotation before beforeSend rejects the triggering event', () => {
    const { faro, transport } = setup(persistent, true, (item) =>
      'name' in item.payload && item.payload.name === 'filtered' ? null : item
    );
    const initialId = faro.api.getSession()?.id;
    jest.advanceTimersByTime(SESSION_INACTIVITY_TIME + 1000);
    faro.api.pushEvent('filtered');
    jest.advanceTimersByTime(250);
    expect(faro.api.getSession()?.id).not.toBe(initialId);
    expect(events(transport).map((item) => item.payload.name)).toEqual([EVENT_SESSION_EXTEND]);
  });

  it('keeps active unsampled sessions alive without a new sampling decision', () => {
    const { faro, transport } = setup(persistent, true, undefined, 0);
    const initial = stored(persistent);
    for (let minute = 0; minute < 16; minute++) {
      jest.advanceTimersByTime(60_000);
      faro.api.pushEvent(`sampled-out-${minute}`);
      jest.advanceTimersByTime(250);
    }
    const current = stored(persistent);
    expect(current.sessionId).toBe(initial.sessionId);
    expect(current.started).toBe(initial.started);
    expect(current.isSampled).toBe(false);
    expect(current.lastActivity).toBe(dateNow());
    expect(transport.items).toEqual([]);
  });

  it('does not refresh a replacement session when an old batch is accepted', () => {
    const { faro, transport } = setup(persistent, true, (item) =>
      'name' in item.payload && item.payload.name === 'old' ? item : null
    );
    const initialId = faro.api.getSession()?.id;
    faro.api.pushEvent('old');
    faro.api.setSession({ id: 'replacement', attributes: { isSampled: 'true' } });
    const replacement = stored(persistent);
    jest.advanceTimersByTime(2000);
    expect(events(transport).map((item) => item.meta.session?.id)).toEqual([initialId]);
    expect(stored(persistent).lastActivity).toBe(replacement.lastActivity);
    expect(stored(persistent).sessionId).toBe('replacement');
  });

  it('continues checking and recording activity after a backward clock adjustment', () => {
    const { faro } = setup(persistent);
    const initial = stored(persistent);
    jest.setSystemTime(dateNow() - 60 * 60 * 1000);
    jest.advanceTimersByTime(2000);
    faro.api.pushEvent('after-clock-adjustment');
    jest.advanceTimersByTime(250);
    expect(stored(persistent).lastActivity).toBe(dateNow());
    expect(stored(persistent).lastActivity).toBeLessThan(initial.lastActivity);

    const storage = persistent ? window.localStorage : window.sessionStorage;
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...createUserSessionObject({ sessionId: 'replacement' }),
        sessionMeta: { id: 'replacement', attributes: { isSampled: 'true' } },
      })
    );
    jest.advanceTimersByTime(2000);
    faro.api.pushEvent('after-storage-change');
    jest.advanceTimersByTime(250);
    // Only persistent managers adopt another document's stored metadata.
    if (persistent) {
      expect(faro.api.getSession()?.id).toBe('replacement');
      expect(stored(persistent).lastActivity).toBe(dateNow());
    }
  });
});

it('does not refresh activity again for fetch-v2 retries', async () => {
  const fetchMock = jest
    .fn()
    .mockResolvedValueOnce({ status: 503, headers: { get: () => null }, text: async () => '' })
    .mockResolvedValueOnce({ status: 202, headers: { get: () => null }, text: async () => '' });
  globalThis.fetch = fetchMock;
  const transport = new FetchTransport({
    url: 'https://collector.test/collect',
    requestTimeoutMs: 0,
    requestOptions: { keepalive: false },
    retry: { initialBackoffMs: 1000 },
    getRandom: () => 0.5,
  });
  const faro: Faro = initializeFaro(
    mockConfig({
      transports: [transport],
      beforeSend: (item) => ('name' in item.payload && item.payload.name === 'activity' ? item : null),
      instrumentations: [new SessionInstrumentation()],
      sessionTracking: { enabled: true, persistent: false, samplingRate: 1 },
    })
  );
  jest.advanceTimersByTime(2000);
  faro.api.pushEvent('activity');
  await jest.advanceTimersByTimeAsync(0);
  const acceptedAt = stored(false).lastActivity;
  expect(acceptedAt).toBe(dateNow());
  await jest.advanceTimersByTimeAsync(1100);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(stored(false).lastActivity).toBe(acceptedAt);
});
