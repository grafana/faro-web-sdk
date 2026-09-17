import { type EventEvent, type Faro, type TransportItem, TransportItemType } from '@grafana/faro-core';
import { MockTransport } from '@grafana/faro-core/src/testUtils';

import type { BrowserConfig } from '../../config';
import { initializeFaro } from '../../initialize';

import { SessionInstrumentation } from './instrumentation';
import { STORAGE_KEY } from './sessionManager';

describe('prerendered sessions', () => {
  let prerendering: boolean;
  let faro: Faro;
  let transport: MockTransport;
  let instrumentation: SessionInstrumentation;
  let documentListeners: jest.SpyInstance;
  const originalPrerendering = Object.getOwnPropertyDescriptor(document, 'prerendering');

  beforeEach(() => {
    jest.useFakeTimers();
    window.sessionStorage.clear();
    window.localStorage.clear();
    prerendering = true;
    Object.defineProperty(document, 'prerendering', { configurable: true, get: () => prerendering });
    documentListeners = jest.spyOn(document, 'addEventListener');
    transport = new MockTransport();
    instrumentation = new SessionInstrumentation();
  });

  afterEach(() => {
    faro?.pause();
    instrumentation.destroy();
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

  function start(overrides: Partial<BrowserConfig> = {}) {
    faro = initializeFaro({
      app: { name: 'prerender-test' },
      isolate: true,
      preventGlobalExposure: true,
      transports: [transport],
      instrumentations: [instrumentation],
      sessionTracking: { samplingRate: 1 },
      ...overrides,
    });
  }

  function activate() {
    // Chromium discards prerender sessionStorage writes before activation.
    window.sessionStorage.clear();
    prerendering = false;
    document.dispatchEvent(new Event('prerenderingchange'));
    document.dispatchEvent(new Event('visibilitychange'));
  }

  function events() {
    return transport.items as Array<TransportItem<EventEvent>>;
  }

  function storeExistingSession(persistent: boolean) {
    const storage = persistent ? window.localStorage : window.sessionStorage;
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        sessionId: 'stored-session',
        started: Date.now(),
        lastActivity: Date.now(),
        isSampled: true,
        sessionMeta: {
          id: 'stored-session',
          attributes: { isSampled: 'true' },
          overrides: { serviceName: 'previous-app', geoLocationTrackingEnabled: true },
        },
      })
    );
    return storage;
  }

  it.each([false, true])('honors a reset before activation, persistent=%s', (persistent) => {
    start({ sessionTracking: { persistent, samplingRate: 1, session: { id: 'configured-session' } } });
    faro.api.setSession({ id: 'discarded-session', attributes: { discarded: 'true' } });
    faro.api.resetSession();
    faro.api.setView({ name: 'checkout' }, { overrides: { serviceName: 'checkout' } });
    const storage = storeExistingSession(persistent);
    prerendering = false;
    document.dispatchEvent(new Event('prerenderingchange'));
    jest.advanceTimersByTime(2000);

    const session = faro.api.getSession();
    expect(session?.id).toEqual(expect.any(String));
    expect(['configured-session', 'stored-session', 'discarded-session']).not.toContain(session?.id);
    expect(session?.attributes?.['discarded']).toBeUndefined();
    expect(session?.overrides?.serviceName).toBe('checkout');
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).sessionId).toBe(session?.id);
    expect(events().map((item) => item.payload.name)).toEqual(['session_start']);
  });

  describe.each([false, true])('explicit API writes with persistent=%s', (persistent) => {
    describe.each([false, true])('override inheritance with prerendering=%s', (isPrerendering) => {
      it.each([{ serviceName: 'replacement-app' }, {}])(
        'respects explicit replacement overrides %j across a reset',
        (overrides) => {
          prerendering = isPrerendering;
          storeExistingSession(persistent);
          start({ sessionTracking: { persistent, samplingRate: 1 } });
          faro.api.setView({ name: 'checkout' }, { overrides: { serviceName: 'checkout' } });
          faro.api.setSession({ id: 'replacement', overrides });
          faro.api.resetSession();
          prerendering = false;
          document.dispatchEvent(new Event('prerenderingchange'));
          faro.api.pushEvent('after-write');
          jest.advanceTimersByTime(2000);

          const expected = Object.keys(overrides).length > 0 ? overrides : undefined;
          expect(faro.api.getSession()?.overrides).toEqual(expected);
          expect(events().find((item) => item.payload.name === 'after-write')?.meta.session?.overrides).toEqual(
            expected
          );
        }
      );

      it.each([
        { source: 'setView', write: 'reset' },
        { source: 'setView', write: 'replace' },
        { source: 'storage', write: 'reset' },
        { source: 'storage', write: 'replace' },
      ])('preserves overrides from $source after $write', ({ source, write }) => {
        prerendering = isPrerendering;
        const storage = storeExistingSession(persistent);
        start({
          sessionTracking: {
            persistent,
            samplingRate: 1,
            session: { overrides: { serviceName: 'configured-app' } },
          },
        });
        if (source === 'setView') {
          faro.api.setView({ name: 'checkout' }, { overrides: { serviceName: 'checkout' } });
        }
        if (write === 'reset') {
          faro.api.resetSession();
        } else {
          faro.api.setSession({ id: 'replacement' });
        }
        prerendering = false;
        document.dispatchEvent(new Event('prerenderingchange'));
        faro.api.pushEvent('after-write');
        jest.advanceTimersByTime(2000);

        const overrides = {
          serviceName: source === 'setView' ? 'checkout' : 'previous-app',
          geoLocationTrackingEnabled: true,
        };
        expect(faro.api.getSession()?.overrides).toEqual(overrides);
        expect(JSON.parse(storage.getItem(STORAGE_KEY)!).sessionMeta.overrides).toEqual(overrides);
        const event = events().find((item) => item.payload.name === 'after-write');
        expect(event?.meta.session?.overrides).toEqual(overrides);
        expect(faro.api.getSession()?.id).not.toBe('stored-session');
        if (write === 'replace') {
          expect(faro.api.getSession()?.id).toBe('replacement');
        }
      });
    });

    it.each(['setSession', 'setView', 'sessionPayload'] as const)(
      'keeps %s overrides that equal configuration',
      (method) => {
        start({
          sessionTracking: { persistent, samplingRate: 1, session: { overrides: { serviceName: 'checkout' } } },
        });
        if (method === 'setSession') {
          faro.api.setSession({ attributes: { pending: 'kept' } }, { overrides: { serviceName: 'checkout' } });
        } else if (method === 'sessionPayload') {
          faro.api.setSession({ overrides: { serviceName: 'checkout' } });
        } else {
          faro.api.setView({ name: 'checkout' }, { overrides: { serviceName: 'checkout' } });
        }
        storeExistingSession(persistent);
        prerendering = false;
        document.dispatchEvent(new Event('prerenderingchange'));

        expect(faro.api.getSession()?.id).toBe('stored-session');
        expect(faro.api.getSession()?.overrides).toEqual(
          method === 'sessionPayload'
            ? { serviceName: 'checkout' }
            : { serviceName: 'checkout', geoLocationTrackingEnabled: true }
        );
      }
    );

    it('honors an explicit session ID matching configuration after a reset', () => {
      start({ sessionTracking: { persistent, samplingRate: 1, session: { id: 'configured-session' } } });
      faro.api.resetSession();
      faro.api.setSession({ id: 'configured-session' });
      storeExistingSession(persistent);
      prerendering = false;
      document.dispatchEvent(new Event('prerenderingchange'));
      jest.advanceTimersByTime(2000);

      expect(faro.api.getSession()?.id).toBe('configured-session');
      expect(events().map((item) => item.payload.name)).toEqual(['session_start']);
    });
  });

  it.each([true, false])('creates and emits exactly one session after activation, batched=%s', (batched) => {
    start({ batching: { enabled: batched } });
    faro.api.setUser({ id: 'user-before-activation' });
    faro.api.pushEvent('speculative-event');
    jest.advanceTimersByTime(2000);

    expect(faro.api.getSession()).toBeUndefined();
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(transport.items).toEqual([]);

    activate();
    faro.api.pushEvent('visible-event');
    jest.advanceTimersByTime(2000);

    const sessionId = faro.api.getSession()?.id;
    expect(sessionId).toEqual(expect.any(String));
    expect(JSON.parse(window.sessionStorage.getItem(STORAGE_KEY)!).sessionId).toBe(sessionId);
    expect(events().map((item) => item.payload.name)).toEqual(['session_start', 'visible-event']);
    expect(events().every((item) => item.meta.session?.id === sessionId)).toBe(true);
    expect(events().every((item) => item.meta.user?.id === 'user-before-activation')).toBe(true);
  });

  it('drops speculative events still queued when activation happens', () => {
    start();
    faro.api.pushEvent('queued-before-activation');
    activate();
    faro.api.pushEvent('after-activation');
    jest.advanceTimersByTime(2000);

    expect(events().map((item) => item.payload.name)).toEqual(['session_start', 'after-activation']);
  });

  it.each([false, true])('preserves pending session metadata when resuming, persistent=%s', (persistent) => {
    const storage = persistent ? window.localStorage : window.sessionStorage;
    start({
      sessionTracking: {
        persistent,
        samplingRate: 1,
        session: { attributes: { configured: 'kept' }, overrides: { geoLocationTrackingEnabled: false } },
      },
    });
    faro.api.setSession({ attributes: { custom: 'pending', shared: 'pending' } });
    faro.api.setView({ name: 'checkout' }, { overrides: { serviceName: 'checkout-service' } });
    // Activation exposes the real tab's storage, including changes made since prerendering started.
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        sessionId: 'activated-session',
        started: Date.now(),
        lastActivity: Date.now(),
        isSampled: true,
        sessionMeta: {
          id: 'activated-session',
          attributes: { stored: 'kept', shared: 'stored', isSampled: 'true' },
          overrides: { serviceName: 'stored-service', geoLocationTrackingEnabled: true },
        },
      })
    );
    prerendering = false;
    document.dispatchEvent(new Event('prerenderingchange'));
    faro.api.pushEvent('after-activation');
    jest.advanceTimersByTime(2000);

    const session = faro.api.getSession();
    expect(session).toEqual({
      id: 'activated-session',
      attributes: { configured: 'kept', stored: 'kept', custom: 'pending', shared: 'pending', isSampled: 'true' },
      overrides: { serviceName: 'checkout-service', geoLocationTrackingEnabled: true },
    });
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).sessionMeta).toEqual(session);
    expect(events().map((item) => item.payload.name)).toEqual(['session_resume', 'after-activation']);
    expect(events().every((item) => item.meta.session?.overrides?.serviceName === 'checkout-service')).toBe(true);
    expect(events().every((item) => item.meta.view?.name === 'checkout')).toBe(true);
  });

  it('preserves a session ID, attributes and overrides explicitly set before activation', () => {
    start();
    faro.api.setSession(
      { id: 'manual-session', attributes: { custom: 'kept' } },
      { overrides: { serviceName: 'manual-service' } }
    );
    faro.api.pushEvent('speculative-event');
    activate();
    jest.advanceTimersByTime(2000);

    expect(faro.api.getSession()).toEqual({
      id: 'manual-session',
      attributes: { custom: 'kept', isSampled: 'true' },
      overrides: { serviceName: 'manual-service' },
    });
    expect(events().map((item) => item.payload.name)).toEqual(['session_start']);
  });

  it('does not queue speculative signals even with an explicitly sampled session', () => {
    const beforeSend = jest.fn((item: TransportItem) => item);
    start({ beforeSend });
    faro.api.setSession({ id: 'manual-session', attributes: { isSampled: 'true' } });
    faro.api.pushEvent('speculative-event');
    faro.api.pushMeasurement({ type: 'test', values: { value: 1 } });
    activate();
    faro.api.pushMeasurement({ type: 'test', values: { value: 1 } });
    jest.advanceTimersByTime(2000);

    expect(events().filter((item) => item.payload.name === 'speculative-event')).toEqual([]);
    expect(transport.items.filter((item) => item.type === TransportItemType.MEASUREMENT)).toHaveLength(1);
    expect(beforeSend).toHaveBeenCalledTimes(2);
  });

  it('preserves setView overrides without overwriting newer stored metadata with configuration', () => {
    start({
      sessionTracking: {
        samplingRate: 1,
        session: {
          id: 'configured-session',
          attributes: { shared: 'configured' },
          overrides: { serviceName: 'configured-service', geoLocationTrackingEnabled: false },
        },
      },
    });
    faro.api.setView({ name: 'checkout' }, { overrides: { serviceName: 'checkout-service' } });
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        sessionId: 'stored-session',
        started: Date.now(),
        lastActivity: Date.now(),
        isSampled: true,
        sessionMeta: {
          id: 'stored-session',
          attributes: { shared: 'stored', isSampled: 'true' },
          overrides: { serviceName: 'stored-service', geoLocationTrackingEnabled: true },
        },
      })
    );
    prerendering = false;
    document.dispatchEvent(new Event('prerenderingchange'));

    expect(faro.api.getSession()).toEqual({
      id: 'stored-session',
      attributes: { shared: 'stored', isSampled: 'true' },
      overrides: { serviceName: 'checkout-service', geoLocationTrackingEnabled: true },
    });
  });

  it.each([true, false])('does not let discarded signals suppress signals at activation, batched=%s', (batched) => {
    const error = new Error('same error');
    const pushSignals = () => {
      faro.api.pushMeasurement({ type: 'test', values: { value: 1 } });
      faro.api.pushLog(['same log']);
      faro.api.pushError(error);
      faro.api.pushEvent('same event');
    };
    // This listener runs before the session instrumentation's activation listener.
    document.addEventListener('prerenderingchange', pushSignals, { once: true });
    start({ batching: { enabled: batched }, dedupe: true });
    pushSignals();
    jest.advanceTimersByTime(2000);
    expect(transport.items).toEqual([]);

    activate();
    pushSignals();
    jest.advanceTimersByTime(2000);

    for (const type of [TransportItemType.MEASUREMENT, TransportItemType.LOG, TransportItemType.EXCEPTION]) {
      expect(transport.items.filter((item) => item.type === type)).toHaveLength(1);
    }
    expect(events().filter((item) => item.payload.name === 'same event')).toHaveLength(1);
    expect(transport.items.every((item) => item.meta.session?.id === faro.api.getSession()?.id)).toBe(true);
  });

  it('assigns the session to web vitals emitted by an earlier activation listener', () => {
    // WebVitalsInstrumentation initializes before SessionInstrumentation.
    document.addEventListener(
      'prerenderingchange',
      () => faro.api.pushMeasurement({ type: 'web-vitals', values: { ttfb: 0 } }),
      { once: true }
    );
    start();
    activate();
    jest.advanceTimersByTime(2000);

    expect(transport.items).toContainEqual(
      expect.objectContaining({
        payload: expect.objectContaining({ type: 'web-vitals', values: { ttfb: 0 } }),
        meta: expect.objectContaining({ session: { id: faro.api.getSession()?.id } }),
      })
    );
    expect(events().filter((item) => item.payload.name === 'session_start')).toHaveLength(1);
  });

  it.each([false, true])('resumes storage as it exists at activation, persistent=%s', (persistent) => {
    const storage = persistent ? window.localStorage : window.sessionStorage;
    const storedSession = JSON.stringify({
      sessionId: 'existing-session',
      started: Date.now(),
      lastActivity: Date.now(),
      isSampled: true,
      sessionMeta: { id: 'existing-session', attributes: { isSampled: 'true', custom: 'preserved' } },
    });
    storage.setItem(STORAGE_KEY, storedSession);
    start({ sessionTracking: { persistent, samplingRate: 1 } });
    faro.api.pushEvent('speculative-event');
    jest.advanceTimersByTime(2000);

    expect(storage.getItem(STORAGE_KEY)).toBe(storedSession);
    expect(transport.items).toEqual([]);
    // The activated document sees the real tab's storage, including updates
    // made while it was prerendering, rather than the speculative copy.
    storage.setItem(STORAGE_KEY, storedSession.replaceAll('existing-session', 'activated-session'));
    prerendering = false;
    document.dispatchEvent(new Event('prerenderingchange'));
    faro.api.pushEvent('after-activation');
    jest.advanceTimersByTime(2000);

    expect(faro.api.getSession()?.id).toBe('activated-session');
    expect(events().map((item) => item.payload.name)).toEqual(['session_resume', 'after-activation']);
    expect(events().every((item) => item.meta.session?.attributes?.['custom'] === 'preserved')).toBe(true);
  });

  it('honors the sampling decision made at activation', () => {
    const sampler = jest.fn(() => 0);
    start({ sessionTracking: { sampler } });
    jest.advanceTimersByTime(2000);
    expect(sampler).not.toHaveBeenCalled();

    activate();
    faro.api.pushEvent('not-sampled');
    jest.advanceTimersByTime(2000);

    expect(sampler).toHaveBeenCalledTimes(1);
    expect(JSON.parse(window.sessionStorage.getItem(STORAGE_KEY)!).isSampled).toBe(false);
    expect(transport.items).toEqual([]);
  });

  it('does not create a session when removed before activation', () => {
    start();
    faro.instrumentations.remove(instrumentation);
    expect(faro.metas.shouldCapture?.()).toBe(true);
    activate();
    jest.advanceTimersByTime(2000);

    expect(faro.api.getSession()).toBeUndefined();
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(transport.items).toEqual([]);
    expect(faro.transports.getBeforeSendHooks()).toEqual([]);
  });

  it('activates only once after removing and readding the instrumentation', () => {
    start();
    faro.instrumentations.remove(instrumentation);
    faro.instrumentations.add(instrumentation);
    activate();
    document.dispatchEvent(new Event('prerenderingchange'));
    jest.advanceTimersByTime(2000);

    expect(events().map((item) => item.payload.name)).toEqual(['session_start']);
    expect(faro.transports.getBeforeSendHooks()).toHaveLength(1);
  });

  it('preserves an explicit pause across activation', () => {
    start();
    faro.pause();
    activate();
    jest.advanceTimersByTime(2000);
    const sessionId = faro.api.getSession()?.id;

    expect(faro.transports.isPaused()).toBe(true);
    expect(transport.items).toEqual([]);
    faro.unpause();
    faro.api.pushEvent('after-unpause');
    jest.advanceTimersByTime(2000);
    expect(events().map((item) => [item.payload.name, item.meta.session?.id])).toEqual([['after-unpause', sessionId]]);
  });

  it('does not change behavior when session tracking is disabled', () => {
    start({ sessionTracking: { enabled: false } });
    faro.api.pushEvent('without-session-tracking');
    jest.advanceTimersByTime(2000);

    expect(faro.api.getSession()).toBeUndefined();
    expect(events().map((item) => item.payload.name)).toEqual(['without-session-tracking']);
  });
});
