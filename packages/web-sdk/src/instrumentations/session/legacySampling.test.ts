import { initializeFaro } from '@grafana/faro-core';
import { getInternalMetas } from '@grafana/faro-core/internal';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { SessionInstrumentation } from './instrumentation';
import { SESSION_INACTIVITY_TIME, STORAGE_KEY } from './sessionManager';

describe('legacy sampling bridge', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it.each([0, 1])('uses samplingRate %s at the pre-batch interceptor', (samplingRate) => {
    const transport = new MockTransport();
    const faro = initializeFaro(
      mockConfig({ transports: [transport], sessionTracking: { enabled: true, samplingRate } })
    );
    const events = jest.fn();
    getInternalMetas(faro.metas).addSessionCreatedListener(events);
    const instrumentation = new SessionInstrumentation();
    faro.instrumentations.add(instrumentation);

    faro.api.pushEvent('test');
    expect(events).toHaveBeenCalledWith({
      session: expect.objectContaining({ sampling: { kept: samplingRate === 1 } }),
      reason: 'start',
    });
    expect(transport.items.some((item) => 'name' in item.payload && item.payload.name === 'test')).toBe(
      samplingRate === 1
    );
    expect(faro.api.getSession()?.attributes?.['isSampled']).toBeUndefined();
    expect(JSON.parse(window.sessionStorage.getItem(STORAGE_KEY)!).sampling).toEqual({ kept: samplingRate === 1 });
    faro.instrumentations.remove(instrumentation);
  });

  it('reuses a stored verdict on resume and creates a new verdict for an explicit id', () => {
    const transport = new MockTransport();
    const faro = initializeFaro(
      mockConfig({ transports: [transport], sessionTracking: { enabled: true, samplingRate: 0 } })
    );
    const events = jest.fn();
    getInternalMetas(faro.metas).addSessionCreatedListener(events);
    const instrumentation = new SessionInstrumentation();
    faro.instrumentations.add(instrumentation);
    const stored = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY)!);
    stored.sampling = { kept: true };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    faro.instrumentations.remove(instrumentation);
    faro.instrumentations.add(instrumentation);
    faro.api.pushEvent('resumed');
    expect(events).toHaveBeenCalledWith({
      session: expect.objectContaining({ sampling: { kept: true } }),
      reason: 'resume',
    });
    expect(transport.items.some((item) => 'name' in item.payload && item.payload.name === 'resumed')).toBe(true);

    faro.api.setSession({ id: 'explicit' });
    expect(events).toHaveBeenCalledWith({
      session: expect.objectContaining({ sessionId: 'explicit', sampling: { kept: false } }),
      reason: 'explicit',
    });
    faro.api.pushEvent('dropped');
    expect(transport.items.some((item) => 'name' in item.payload && item.payload.name === 'dropped')).toBe(false);
    faro.instrumentations.remove(instrumentation);
  });

  it('notifies a rotation before delivering the first item of the new session', () => {
    jest.useFakeTimers();
    try {
      const transport = new MockTransport();
      const faro = initializeFaro(
        mockConfig({ transports: [transport], sessionTracking: { enabled: true, samplingRate: 1 } })
      );
      const events = jest.fn();
      getInternalMetas(faro.metas).addSessionCreatedListener(events);
      const instrumentation = new SessionInstrumentation();
      faro.instrumentations.add(instrumentation);
      const initialId = faro.api.getSession()?.id;

      jest.advanceTimersByTime(SESSION_INACTIVITY_TIME + 1);
      faro.api.pushEvent('after-idle');
      expect(faro.api.getSession()?.id).not.toBe(initialId);
      expect(events).toHaveBeenCalledWith({
        session: expect.objectContaining({ sampling: { kept: true } }),
        reason: 'rotate',
      });
      expect(transport.items.some((item) => 'name' in item.payload && item.payload.name === 'after-idle')).toBe(true);
      faro.instrumentations.remove(instrumentation);
    } finally {
      jest.useRealTimers();
    }
  });

  it('adopts a persistent session with its stored verdict unchanged', () => {
    jest.useFakeTimers();
    try {
      const a = initializeFaro(
        mockConfig({
          instrumentations: [new SessionInstrumentation()],
          sessionTracking: { enabled: true, persistent: true },
        })
      );
      const b = initializeFaro(
        mockConfig({
          instrumentations: [new SessionInstrumentation()],
          sessionTracking: { enabled: true, persistent: true },
        })
      );
      const adopted = jest.fn();
      getInternalMetas(b.metas).addSessionCreatedListener(adopted);
      a.api.setSession({ id: 'from-a' });
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
      stored.sampling = { kept: false };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

      jest.advanceTimersByTime(1001);
      b.api.pushEvent('after-adoption');
      expect(b.api.getSession()?.id).toBe('from-a');
      expect(adopted).toHaveBeenCalledWith({
        session: expect.objectContaining({ sessionId: 'from-a', sampling: { kept: false } }),
        reason: 'resume',
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('round-trips an opaque stored sampling state on resume', () => {
    const sampling = { verdict: { keptBy: 'rule' }, armedRuleIds: ['late-error'] };
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        sessionId: 'opaque-session',
        started: Date.now(),
        lastActivity: Date.now(),
        sampling,
        sessionMeta: { id: 'opaque-session' },
      })
    );

    const faro = initializeFaro(
      mockConfig({
        instrumentations: [new SessionInstrumentation()],
        sessionTracking: { enabled: true, samplingRate: 1 },
      })
    );
    expect(faro.api.getSession()?.id).toBe('opaque-session');
    expect(JSON.parse(window.sessionStorage.getItem(STORAGE_KEY)!).sampling).toEqual(sampling);
  });
});
