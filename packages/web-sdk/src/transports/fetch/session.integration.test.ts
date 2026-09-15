import { captureMetas, type Faro, type TransportBody, TransportItemType } from '@grafana/faro-core';

import { initializeFaro } from '../../initialize';
import { SessionInstrumentation } from '../../instrumentations/session/instrumentation';
import {
  PersistentSessionsManager,
  SESSION_EXPIRATION_TIME,
  SESSION_INACTIVITY_TIME,
  STORAGE_KEY,
  VolatileSessionsManager,
} from '../../instrumentations/session/sessionManager';

import { FetchTransport } from './transport';

type CapturedRequest = { header: string | undefined; body: TransportBody };

describe('default Fetch transport session ownership', () => {
  const originalFetch = globalThis.fetch;
  let faro: Faro;
  let requests: CapturedRequest[];
  let invalidateNext: boolean;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-08T12:00:00Z'));
    window.localStorage.clear();
    window.sessionStorage.clear();
    requests = [];
    invalidateNext = false;
    globalThis.fetch = jest.fn(async (_url, init) => {
      requests.push({
        header: (init!.headers as Record<string, string>)['x-faro-session-id'],
        body: JSON.parse(init!.body as string),
      });
      const invalid = invalidateNext;
      invalidateNext = false;
      return {
        status: 202,
        headers: { get: (name: string) => (name === 'X-Faro-Session-Status' && invalid ? 'invalid' : null) },
        text: async () => '',
      } as unknown as Response;
    });
  });

  afterEach(() => {
    faro?.pause();
    faro?.instrumentations.remove(...faro.instrumentations.instrumentations);
    faro?.transports.remove(...faro.transports.transports);
    jest.restoreAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
    globalThis.fetch = originalFetch;
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  async function start(persistent: boolean, enabled = true, batched = true) {
    faro = initializeFaro({
      url: 'https://collector.test/collect',
      app: { name: 'legacy-compat' },
      isolate: true,
      preventGlobalExposure: true,
      instrumentations: [new SessionInstrumentation()],
      batching: { enabled: batched },
      sessionTracking: { enabled, persistent, samplingRate: 1 },
    });
    expect(faro.transports.transports[0]).toBeInstanceOf(FetchTransport);
    await jest.advanceTimersByTimeAsync(2000);
    requests.length = 0;
  }

  function storage(persistent: boolean) {
    return persistent ? window.localStorage : window.sessionStorage;
  }

  function events() {
    return requests.flatMap(({ header, body }) =>
      (body.events ?? []).map((event) => ({
        name: event.name,
        payloadSession: body.meta.session?.id,
        headerSession: header,
      }))
    );
  }

  it.each([true, false])(
    'ordinary delivery and collector invalidation still work, persistent=%s',
    async (persistent) => {
      await start(persistent);
      const previous = faro.api.getSession()?.id;
      faro.api.pushEvent('ordinary');
      await jest.advanceTimersByTimeAsync(250);
      expect(events()).toEqual([
        {
          name: 'ordinary',
          payloadSession: previous,
          headerSession: previous,
        },
      ]);
      requests.length = 0;
      invalidateNext = true;
      faro.api.pushEvent('collector-invalidates');
      await jest.advanceTimersByTimeAsync(500);
      expect(faro.api.getSession()?.id).not.toBe(previous);
      expect(JSON.parse(storage(persistent).getItem(STORAGE_KEY)!).sessionId).toBe(faro.api.getSession()?.id);
    }
  );

  it('delivery still works with session tracking disabled', async () => {
    await start(false, false);
    faro.api.pushEvent('no-session-tracking');
    await jest.advanceTimersByTimeAsync(250);
    expect(events()).toHaveLength(1);
    expect(events()[0]?.name).toBe('no-session-tracking');
    expect(requests[0]?.header).toBe(requests[0]?.body.meta.session?.id);
  });

  describe.each([true, false])('persistent=%s', (persistent) => {
    it.each(['lifetime', 'inactivity'])(
      'keeps the default transport header aligned when a batch crosses %s expiry',
      async (expiry) => {
        await start(persistent);
        const persisted = JSON.parse(storage(persistent).getItem(STORAGE_KEY)!);
        const oldId = faro.api.getSession()?.id;
        const deadline =
          expiry === 'lifetime'
            ? persisted.started + SESSION_EXPIRATION_TIME
            : persisted.lastActivity + SESSION_INACTIVITY_TIME;

        jest.setSystemTime(deadline - 100);
        if (expiry === 'lifetime') {
          // The user remained active; isolate the absolute lifetime boundary.
          persisted.lastActivity = Date.now();
          storage(persistent).setItem(STORAGE_KEY, JSON.stringify(persisted));
        }
        faro.api.pushEvent('before-expiry');
        expect(requests).toHaveLength(0);
        jest.setSystemTime(deadline + 1);
        faro.api.pushEvent('after-expiry');
        await jest.advanceTimersByTimeAsync(250);
        expect(faro.api.getSession()?.id).not.toBe(oldId);
        const observed = events().filter((event) => /^(before|after)-expiry$/.test(event.name));
        expect(observed).toHaveLength(2);
        for (const event of observed) {
          expect(event.headerSession).toBe(event.payloadSession);
        }
      }
    );
  });

  it.each([true, false])('public updateSession still refreshes activity, persistent=%s', async (persistent) => {
    await start(persistent);
    const before = JSON.parse(storage(persistent).getItem(STORAGE_KEY)!);
    const manager = persistent ? new PersistentSessionsManager() : new VolatileSessionsManager();
    jest.setSystemTime(Date.now() + 2000);
    manager.updateSession();
    const after = JSON.parse(storage(persistent).getItem(STORAGE_KEY)!);
    expect(after.sessionId).toBe(before.sessionId);
    expect(after.lastActivity).toBe(Date.now());
  });

  it.each([true, false])('direct transports.execute still reconciles expiry, persistent=%s', async (persistent) => {
    await start(persistent);
    const before = JSON.parse(storage(persistent).getItem(STORAGE_KEY)!);
    jest.setSystemTime(before.lastActivity + SESSION_INACTIVITY_TIME + 1);
    faro.transports.execute({
      type: TransportItemType.EVENT,
      meta: faro.metas.value,
      payload: { name: 'custom-extension-event', timestamp: new Date().toISOString() },
    });
    await jest.advanceTimersByTimeAsync(250);
    expect(faro.api.getSession()?.id).not.toBe(before.sessionId);
    expect(events().find((event) => event.name === 'custom-extension-event')?.payloadSession).toBe(
      faro.api.getSession()?.id
    );
  });

  it('preserves previously captured custom items and explicitly supplied sessions', async () => {
    await start(false);
    const captured = captureMetas(faro.metas);
    const previous = faro.api.getSession()?.id;
    const stored = JSON.parse(storage(false).getItem(STORAGE_KEY)!);
    jest.setSystemTime(stored.lastActivity + SESSION_INACTIVITY_TIME + 1);
    faro.api.pushEvent('establish-replacement');
    const replacement = faro.api.getSession()?.id;
    expect(replacement).not.toBe(previous);
    faro.transports.execute({
      type: TransportItemType.EVENT,
      meta: captured,
      payload: { name: 'already-captured', timestamp: new Date().toISOString() },
    });
    faro.transports.execute({
      type: TransportItemType.EVENT,
      meta: { session: { id: 'explicit-session', attributes: { isSampled: 'true' } } },
      payload: { name: 'explicit-owner', timestamp: new Date().toISOString() },
    });
    await jest.advanceTimersByTimeAsync(250);
    expect(events().find((event) => event.name === 'already-captured')).toMatchObject({
      payloadSession: previous,
      headerSession: previous,
    });
    expect(events().find((event) => event.name === 'explicit-owner')).toMatchObject({
      payloadSession: 'explicit-session',
      headerSession: 'explicit-session',
    });
    expect(faro.api.getSession()?.id).toBe(replacement);
  });

  it('preserves custom attributes and overrides when capture does not rotate the session', async () => {
    await start(false);
    const sessionId = faro.api.getSession()?.id;
    faro.transports.execute({
      type: TransportItemType.EVENT,
      meta: {
        session: {
          id: sessionId,
          attributes: { isSampled: 'true', origin: 'custom-extension' },
          overrides: { serviceName: 'custom-service' },
        },
      },
      payload: { name: 'custom-metadata', timestamp: new Date().toISOString() },
    });
    await jest.advanceTimersByTimeAsync(250);
    expect(requests[0]?.body.meta.session).toEqual({
      id: sessionId,
      attributes: { origin: 'custom-extension' },
      overrides: { serviceName: 'custom-service' },
    });
  });

  it('honors pause triggered by capture before immediate custom delivery', async () => {
    await start(false, true, false);
    faro.config.sessionTracking!.onSessionChange = () => faro.pause();
    const previous = JSON.parse(storage(false).getItem(STORAGE_KEY)!);
    jest.setSystemTime(previous.lastActivity + SESSION_INACTIVITY_TIME + 1);
    faro.transports.execute({
      type: TransportItemType.EVENT,
      meta: faro.metas.value,
      payload: { name: 'paused-during-capture', timestamp: new Date().toISOString() },
    });
    await jest.advanceTimersByTimeAsync(250);
    expect(faro.transports.isPaused()).toBe(true);
    expect(events().some((event) => event.name === 'paused-during-capture')).toBe(false);
    faro.unpause();
    await jest.advanceTimersByTimeAsync(250);
    expect(events().some((event) => event.name === 'paused-during-capture')).toBe(false);
  });

  it('does not retry an accepted batch when onSessionChange throws a TypeError', async () => {
    await start(false);
    const previous = faro.api.getSession()?.id;
    faro.config.sessionTracking!.onSessionChange = jest.fn(() => {
      throw new TypeError('application callback failed');
    });
    invalidateNext = true;
    faro.api.pushEvent('accepted-before-callback-error');
    await jest.advanceTimersByTimeAsync(4_000);
    expect(faro.api.getSession()?.id).not.toBe(previous);
    expect(events().filter((event) => event.name === 'accepted-before-callback-error')).toHaveLength(1);
    expect(faro.config.sessionTracking!.onSessionChange).toHaveBeenCalledTimes(1);
  });

  it.each([true, false])(
    'does not overwrite a session that replaces the guarded storage read, persistent=%s',
    async (persistent) => {
      await start(persistent);
      const session = faro.api.getSession()!;
      const manager = persistent ? PersistentSessionsManager : VolatileSessionsManager;
      const fetchSession = manager.fetchUserSession;
      const replacement = {
        ...fetchSession()!,
        sessionId: 'another-tab',
        sessionMeta: { ...session, id: 'another-tab' },
      };
      let reads = 0;
      jest.spyOn(manager, 'fetchUserSession').mockImplementation(() => {
        if (++reads === 2) {
          storage(persistent).setItem(STORAGE_KEY, JSON.stringify(replacement));
        }
        return fetchSession();
      });
      const changed = jest.fn();
      faro.config.sessionTracking!.onSessionChange = changed;
      invalidateNext = true;
      await faro.transports.transports[0]!.send([
        {
          type: TransportItemType.EVENT,
          meta: { session },
          payload: { name: 'invalidates-old-owner', timestamp: new Date().toISOString() },
        },
      ]);
      expect(JSON.parse(storage(persistent).getItem(STORAGE_KEY)!).sessionId).toBe('another-tab');
      expect(changed).not.toHaveBeenCalled();
    }
  );

  it.each([true, false])(
    'preserves an application session replacement made during renewal, persistent=%s',
    async (persistent) => {
      await start(persistent);
      const session = faro.api.getSession()!;
      faro.config.sessionTracking!.generateSessionId = () => {
        faro.api.setSession({ id: 'application-replacement' });
        return 'obsolete-renewal';
      };
      invalidateNext = true;
      await faro.transports.transports[0]!.send([
        {
          type: TransportItemType.EVENT,
          meta: { session },
          payload: { name: 'reentrant-renewal', timestamp: new Date().toISOString() },
        },
      ]);
      expect(faro.api.getSession()?.id).toBe('application-replacement');
      expect(JSON.parse(storage(persistent).getItem(STORAGE_KEY)!).sessionId).toBe('application-replacement');
    }
  );

  it.each([true, false])(
    'stops response-side renewal when a generator exhausts the deadline, persistent=%s',
    async (persistent) => {
      await start(persistent);
      const session = faro.api.getSession()!;
      faro.config.sessionTracking!.generateSessionId = () => {
        jest.setSystemTime(Date.now() + 10_001);
        return 'too-late';
      };
      invalidateNext = true;
      await faro.transports.transports[0]!.send([
        {
          type: TransportItemType.EVENT,
          meta: { session },
          payload: { name: 'slow-renewal', timestamp: new Date().toISOString() },
        },
      ]);
      expect(faro.api.getSession()?.id).toBe(session.id);
      expect(JSON.parse(storage(persistent).getItem(STORAGE_KEY)!).sessionId).toBe(session.id);
      faro.api.pushEvent('after-deadline');
      await jest.advanceTimersByTimeAsync(250);
      expect(events().some((event) => event.name === 'after-deadline')).toBe(true);
    }
  );

  it('stops response-side renewal when its caller cancels inside the generator', async () => {
    await start(false);
    const controller = new AbortController();
    const transport = new FetchTransport({
      url: 'https://collector.test/collect',
      requestOptions: { signal: controller.signal },
    });
    faro.transports.add(transport);
    const session = faro.api.getSession()!;
    faro.config.sessionTracking!.generateSessionId = () => {
      controller.abort();
      return 'cancelled-renewal';
    };
    invalidateNext = true;
    await transport.send([
      {
        type: TransportItemType.EVENT,
        meta: { session },
        payload: { name: 'cancelled-renewal', timestamp: new Date().toISOString() },
      },
    ]);
    expect(faro.api.getSession()?.id).toBe(session.id);
    expect(JSON.parse(storage(false).getItem(STORAGE_KEY)!).sessionId).toBe(session.id);
  });

  it.each([
    [true, 'replace'],
    [false, 'replace'],
    [true, 'cancel'],
    [false, 'deadline'],
  ] as const)(
    'checks ownership after serializing session overrides, persistent=%s action=%s',
    async (persistent, action) => {
      await start(persistent);
      const controller = new AbortController();
      const transport = new FetchTransport({
        url: 'https://collector.test/collect',
        requestTimeoutMs: 10,
        requestOptions: { signal: controller.signal },
      });
      faro.transports.add(transport);
      const session = faro.api.getSession()!;
      faro.config.sessionTracking!.generateSessionId = () => 'obsolete-renewal';
      let acted = false;
      session.overrides = {};
      Object.defineProperty(session.overrides, 'serviceName', {
        enumerable: true,
        get: () => {
          if (!acted) {
            acted = true;
            if (action === 'replace') {
              faro.api.setSession({ id: 'application-replacement' });
            } else if (action === 'cancel') {
              controller.abort();
            } else {
              jest.setSystemTime(Date.now() + 11);
            }
          }
          return 'application-service';
        },
      });
      invalidateNext = true;
      await transport.send([
        {
          type: TransportItemType.EVENT,
          meta: { session: { id: session.id } },
          payload: { name: 'serialization-renewal', timestamp: new Date().toISOString() },
        },
      ]);
      expect(acted).toBe(true);
      const expected = action === 'replace' ? 'application-replacement' : session.id;
      expect(faro.api.getSession()?.id).toBe(expected);
      expect(JSON.parse(storage(persistent).getItem(STORAGE_KEY)!).sessionId).toBe(expected);
    }
  );
});
