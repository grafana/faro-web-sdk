import { type EventEvent, type Faro, type TransportItem } from '@grafana/faro-core';
import { MockTransport } from '@grafana/faro-core/src/testUtils';

import { initializeFaro } from '../../initialize';

import { SessionInstrumentation } from './instrumentation';
import { SESSION_INACTIVITY_TIME, STORAGE_KEY } from './sessionManager';

describe('session ownership with isolated SDK instances', () => {
  let prerendering: boolean;
  let instances: Faro[];
  let documentListeners: jest.SpyInstance;
  const originalPrerendering = Object.getOwnPropertyDescriptor(document, 'prerendering');

  beforeEach(() => {
    jest.useFakeTimers();
    window.sessionStorage.clear();
    window.localStorage.clear();
    instances = [];
    Object.defineProperty(document, 'prerendering', { configurable: true, get: () => prerendering });
    documentListeners = jest.spyOn(document, 'addEventListener');
  });

  afterEach(() => {
    for (const instance of instances) {
      instance.pause();
      instance.instrumentations.instrumentations.forEach((instrumentation) => instrumentation.destroy?.());
    }
    for (const [type, listener, options] of documentListeners.mock.calls) {
      document.removeEventListener(type, listener, options);
    }
    if (originalPrerendering) {
      Object.defineProperty(document, 'prerendering', originalPrerendering);
    } else {
      Reflect.deleteProperty(document, 'prerendering');
    }
    jest.restoreAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  describe.each([false, true])('persistent=%s', (persistent) => {
    it('activates two isolated instances with their own storage and sampling settings', () => {
      prerendering = true;
      const transportA = new MockTransport();
      const a = initializeFaro({
        app: { name: 'app-a' },
        isolate: true,
        preventGlobalExposure: true,
        batching: { enabled: false },
        transports: [transportA],
        instrumentations: [new SessionInstrumentation()],
        sessionTracking: {
          persistent,
          samplingRate: 1,
          generateSessionId: () => 'session-a',
          session: { id: 'discarded-a' },
        },
      });
      instances.push(a);
      a.api.resetSession();
      const transportB = new MockTransport();
      const b = initializeFaro({
        app: { name: 'app-b' },
        isolate: true,
        preventGlobalExposure: true,
        batching: { enabled: false },
        transports: [transportB],
        instrumentations: [new SessionInstrumentation()],
        sessionTracking: { persistent: !persistent, samplingRate: 0, generateSessionId: () => 'session-b' },
      });
      instances.push(b);

      prerendering = false;
      document.dispatchEvent(new Event('prerenderingchange'));
      a.api.pushEvent('from-a');
      b.api.pushEvent('from-b');
      expect(a.api.getSession()).toMatchObject({ id: 'session-a', attributes: { isSampled: 'true' } });
      expect(b.api.getSession()).toMatchObject({ id: 'session-b', attributes: { isSampled: 'false' } });
      expect(transportA.items).toContainEqual(
        expect.objectContaining({ payload: expect.objectContaining({ name: 'from-a' }) })
      );
      expect(transportB.items).toEqual([]);
      expect(
        JSON.parse((persistent ? window.localStorage : window.sessionStorage).getItem(STORAGE_KEY)!).sessionId
      ).toBe('session-a');
      expect(
        JSON.parse((persistent ? window.sessionStorage : window.localStorage).getItem(STORAGE_KEY)!).sessionId
      ).toBe('session-b');
    });

    it.each([false, true])('keeps session dependencies on the owner with prerendering=%s', (isPrerendering) => {
      prerendering = isPrerendering;
      let nextId = 0;
      const samplerA = jest.fn(({ metas }) => (metas.app.name === 'app-a' ? 1 : 0));
      const onSessionChangeA = jest.fn();
      const transportA = new MockTransport();
      const a = initializeFaro({
        app: { name: 'app-a' },
        isolate: true,
        preventGlobalExposure: true,
        batching: { enabled: false },
        transports: [transportA],
        instrumentations: [new SessionInstrumentation()],
        sessionTracking: {
          persistent,
          sampler: samplerA,
          generateSessionId: () => `session-a-${++nextId}`,
          onSessionChange: onSessionChangeA,
        },
      });
      instances.push(a);
      // B does not manage sessions, so shared storage cannot explain interference.
      const onSessionChangeB = jest.fn();
      const b = initializeFaro({
        app: { name: 'app-b' },
        isolate: true,
        preventGlobalExposure: true,
        batching: { enabled: false },
        transports: [new MockTransport()],
        instrumentations: [],
        sessionTracking: {
          enabled: false,
          persistent,
          samplingRate: 0,
          generateSessionId: () => 'session-b',
          session: { id: 'b-owned', attributes: { owner: 'b' } },
          onSessionChange: onSessionChangeB,
        },
      });
      instances.push(b);
      const bSession = b.api.getSession();
      const listenerB = jest.spyOn(b.metas, 'addListener');
      const storage = persistent ? window.localStorage : window.sessionStorage;

      prerendering = false;
      document.dispatchEvent(new Event('prerenderingchange'));
      a.api.pushEvent('initial');
      expect(a.api.getSession()).toMatchObject({ id: 'session-a-1', attributes: { isSampled: 'true' } });
      expect(samplerA).toHaveBeenCalledWith(
        expect.objectContaining({ metas: expect.objectContaining({ app: a.config.app }) })
      );
      expect(listenerB).not.toHaveBeenCalled();

      // Metadata synchronization and ID generation must remain bound after startup too.
      a.api.setSession({ id: 'replacement-a', attributes: { owner: 'a' } });
      a.api.setView({ name: 'checkout' }, { overrides: { serviceName: 'service-a' } });
      a.api.resetSession();
      expect(a.api.getSession()).toMatchObject({
        id: 'session-a-2',
        attributes: { isSampled: 'true' },
        overrides: { serviceName: 'service-a' },
      });

      // A metadata update in B must not overwrite A's stored session.
      b.api.setUser({ id: 'user-b' });
      expect(JSON.parse(storage.getItem(STORAGE_KEY)!).sessionId).toBe('session-a-2');

      jest.setSystemTime(Date.now() + SESSION_INACTIVITY_TIME + 1);
      jest.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
      document.dispatchEvent(new Event('visibilitychange'));
      a.api.pushEvent('after-expiry');
      expect(a.api.getSession()).toMatchObject({
        id: 'session-a-3',
        attributes: { isSampled: 'true' },
        overrides: { serviceName: 'service-a' },
      });
      expect(onSessionChangeA).toHaveBeenCalledTimes(1);
      expect(onSessionChangeB).not.toHaveBeenCalled();
      expect(b.api.getSession()).toEqual(bSession);
      const events = transportA.items as Array<TransportItem<EventEvent>>;
      expect(events.find((item) => item.payload.name === 'initial')?.meta.session?.id).toBe('session-a-1');
      expect(events.find((item) => item.payload.name === 'after-expiry')?.meta.session?.id).toBe('session-a-3');
    });
  });
});
