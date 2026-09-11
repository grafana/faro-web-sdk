import { EVENT_SESSION_EXTEND, type EventEvent, initializeFaro } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { SessionInstrumentation } from './instrumentation';
import { SESSION_INACTIVITY_TIME, STORAGE_KEY } from './sessionManager';

describe.each([true, false])('session capture with persistent=%s', (persistent) => {
  const instrumentations: SessionInstrumentation[] = [];

  beforeEach(() => {
    jest.useFakeTimers();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    instrumentations.splice(0).forEach((instrumentation) => instrumentation.destroy());
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it.each([false, true])(
    'keeps a nested session from override callbacks, with stored overrides=%s',
    (storedOverrides) => {
      const instrumentation = new SessionInstrumentation();
      instrumentations.push(instrumentation);
      const transport = new MockTransport();
      const sdk = initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [instrumentation],
          sessionTracking: { enabled: true, persistent, samplingRate: 1 },
        })
      );
      if (storedOverrides) {
        sdk.api.setSession({ id: 'previous', overrides: { serviceName: 'stored-service' } });
      }
      let once = true;
      sdk.api.setSession({
        id: 'outer',
        overrides: {
          get serviceName() {
            if (once) {
              once = false;
              sdk.api.setSession({ id: 'nested', attributes: { source: 'nested' } });
            }
            return 'outer-service';
          },
        },
      });
      expect(sdk.api.getSession()).toMatchObject({ id: 'nested', attributes: { source: 'nested', isSampled: 'true' } });
      const storage = persistent ? window.localStorage : window.sessionStorage;
      expect(JSON.parse(storage.getItem(STORAGE_KEY)!).sessionId).toBe('nested');
      sdk.api.pushEvent('after-nested');
      expect(transport.items.at(-1)!.meta.session?.id).toBe('nested');
    }
  );

  it.each([
    { initial: 'repeated', storageFailure: false },
    { initial: 'repeated', storageFailure: true },
    { initial: 'outer', storageFailure: false },
  ])('finishes normalization when the sampler repeats the same semantic session: %j', ({ initial, storageFailure }) => {
    const instrumentation = new SessionInstrumentation();
    instrumentations.push(instrumentation);
    const sdk = initializeFaro(
      mockConfig({
        instrumentations: [instrumentation],
        sessionTracking: { enabled: true, persistent, samplingRate: 1 },
      })
    );
    const storage = persistent ? window.localStorage : window.sessionStorage;
    const previous = JSON.parse(storage.getItem(STORAGE_KEY)!).sessionId;
    if (storageFailure) {
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('storage unavailable');
      });
    }
    let calls = 0;
    sdk.config.sessionTracking!.sampler = () => {
      if (++calls > 3) {
        throw new Error('normalization did not converge');
      }
      sdk.api.setSession({ id: 'repeated', attributes: { source: 'same' } });
      return 1;
    };
    sdk.api.setSession({ id: initial, attributes: { source: 'same' } });
    expect(sdk.api.getSession()).toMatchObject({ id: 'repeated', attributes: { source: 'same', isSampled: 'true' } });
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).sessionId).toBe(storageFailure ? previous : 'repeated');
  });

  it.each(['generator', 'sampler'])(
    'discards precommit telemetry from the %s without poisoning the outer capture',
    (source) => {
      const instrumentation = new SessionInstrumentation();
      instrumentations.push(instrumentation);
      const transport = new MockTransport();
      const sdk = initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [instrumentation],
          dedupe: true,
          sessionTracking: { enabled: true, persistent, samplingRate: 1 },
        })
      );
      transport.items.length = 0;
      const beforeSend = jest.fn((item) => item);
      sdk.transports.addBeforeSendHooks(beforeSend);
      const precommit = () => sdk.api.pushEvent('precommit');
      if (source === 'generator') {
        sdk.config.sessionTracking!.generateSessionId = () => {
          precommit();
          return 'replacement';
        };
      } else {
        sdk.config.sessionTracking!.sampler = () => {
          precommit();
          return 1;
        };
      }
      jest.advanceTimersByTime(SESSION_INACTIVITY_TIME + 1);

      sdk.api.pushEvent('outer');

      const sessionId = sdk.api.getSession()!.id;
      expect(transport.items.map((item) => [(item.payload as EventEvent).name, item.meta.session?.id])).toEqual([
        [EVENT_SESSION_EXTEND, sessionId],
        ['outer', sessionId],
      ]);
      expect(beforeSend).toHaveBeenCalledTimes(2);

      sdk.api.pushEvent('precommit');
      expect((transport.items.at(-1)!.payload as EventEvent).name).toBe('precommit');
    }
  );

  it('revokes callbacks already selected for metadata dispatch when the instrumentation is removed', () => {
    const transport = new MockTransport();
    const sdk = initializeFaro(mockConfig({ transports: [transport], sessionTracking: { enabled: true, persistent } }));
    const instrumentation = new SessionInstrumentation();
    instrumentations.push(instrumentation);
    sdk.metas.addListener((meta) => {
      if (meta.session?.id === 'after-removal') {
        sdk.instrumentations.remove(instrumentation);
      }
    });
    sdk.instrumentations.add(instrumentation);
    transport.items.length = 0;
    const storage = persistent ? window.localStorage : window.sessionStorage;
    const beforeRemoval = storage.getItem(STORAGE_KEY);

    sdk.api.setSession({ id: 'after-removal' });
    jest.advanceTimersByTime(SESSION_INACTIVITY_TIME + 1);
    document.dispatchEvent(new Event('visibilitychange'));

    expect(storage.getItem(STORAGE_KEY)).toBe(beforeRemoval);
    expect(transport.items).toEqual([]);
    expect(sdk.api.getSession()).toEqual({ id: 'after-removal' });
  });

  it.each(['generator', 'sampler'])(
    'retries an independent capture after the %s submits telemetry and throws',
    (source) => {
      const instrumentation = new SessionInstrumentation();
      instrumentations.push(instrumentation);
      const transport = new MockTransport();
      const sdk = initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [instrumentation],
          dedupe: true,
          sessionTracking: { enabled: true, persistent, samplingRate: 1 },
        })
      );
      const sessionId = sdk.api.getSession()!.id;
      const fail = () => {
        sdk.api.pushEvent('precommit');
        throw new Error('precommit failure');
      };
      if (source === 'generator') {
        sdk.config.sessionTracking!.generateSessionId = fail;
      } else {
        sdk.config.sessionTracking!.sampler = fail;
      }
      transport.items.length = 0;
      jest.advanceTimersByTime(SESSION_INACTIVITY_TIME + 1);
      sdk.api.pushEvent('outer');
      expect(transport.items).toEqual([]);
      expect(sdk.api.getSession()!.id).toBe(sessionId);

      delete sdk.config.sessionTracking!.generateSessionId;
      delete sdk.config.sessionTracking!.sampler;
      sdk.api.pushEvent('outer');
      expect(sdk.api.getSession()!.id).not.toBe(sessionId);
      expect(transport.items.map((item) => (item.payload as EventEvent).name)).toEqual([EVENT_SESSION_EXTEND, 'outer']);
    }
  );

  it('does not write or notify after a sampler disposes its manager during reconciliation', () => {
    const instrumentation = new SessionInstrumentation();
    instrumentations.push(instrumentation);
    const onSessionChange = jest.fn();
    const sdk = initializeFaro(
      mockConfig({
        instrumentations: [instrumentation],
        sessionTracking: { enabled: true, persistent, onSessionChange },
      })
    );
    const storage = persistent ? window.localStorage : window.sessionStorage;
    const beforeRemoval = storage.getItem(STORAGE_KEY);
    sdk.config.sessionTracking!.sampler = () => {
      sdk.instrumentations.remove(instrumentation);
      return 1;
    };
    jest.advanceTimersByTime(SESSION_INACTIVITY_TIME + 1);
    sdk.api.pushEvent('outer');

    expect(storage.getItem(STORAGE_KEY)).toBe(beforeRemoval);
    expect(onSessionChange).not.toHaveBeenCalled();
  });

  it('unwinds a partially initialized manager when session creation throws', () => {
    const sdk = initializeFaro(mockConfig({ sessionTracking: { enabled: true, persistent } }));
    const instrumentation = new SessionInstrumentation();
    instrumentations.push(instrumentation);
    sdk.config.sessionTracking!.sampler = () => {
      throw new Error('startup failed');
    };
    expect(() => sdk.instrumentations.add(instrumentation)).toThrow('startup failed');
    delete sdk.config.sessionTracking!.sampler;
    sdk.api.setSession({ id: 'unmanaged' });
    document.dispatchEvent(new Event('visibilitychange'));

    expect((persistent ? window.localStorage : window.sessionStorage).getItem(STORAGE_KEY)).toBeNull();
    expect(sdk.api.getSession()).toEqual({ id: 'unmanaged' });
    expect(sdk.transports.getBeforeSendHooks()).toHaveLength(0);
  });

  it('normalizes once when the session store cannot accept writes', () => {
    const instrumentation = new SessionInstrumentation();
    instrumentations.push(instrumentation);
    const sdk = initializeFaro(
      mockConfig({
        instrumentations: [instrumentation],
        sessionTracking: { enabled: true, persistent },
      })
    );
    const originalSetItem = Storage.prototype.setItem;
    const writes = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === STORAGE_KEY) {
        throw new Error('storage full');
      }
      originalSetItem.call(this, key, value);
    });

    expect(() => sdk.api.setSession({ id: 'replacement' })).not.toThrow();

    expect(sdk.api.getSession()).toMatchObject({ id: 'replacement', attributes: { isSampled: 'true' } });
    expect(writes.mock.calls.filter(([key]) => key === STORAGE_KEY)).toHaveLength(1);
  });

  it('normalizes a later nested replacement and retains its metadata in storage', () => {
    const instrumentation = new SessionInstrumentation();
    instrumentations.push(instrumentation);
    const sdk = initializeFaro(
      mockConfig({
        instrumentations: [instrumentation],
        sessionTracking: { enabled: true, persistent },
      })
    );
    sdk.metas.addListener((meta) => {
      if (meta.session?.id === 'outer' && meta.session.attributes?.['isSampled']) {
        sdk.api.setSession({ id: 'nested', attributes: { owner: 'latest' } });
      }
    });

    sdk.api.setSession({ id: 'outer' });

    const expected = { id: 'nested', attributes: { owner: 'latest', isSampled: 'true' } };
    expect(sdk.api.getSession()).toMatchObject(expected);
    expect(
      JSON.parse((persistent ? window.localStorage : window.sessionStorage).getItem(STORAGE_KEY)!).sessionMeta
    ).toMatchObject(expected);
  });
});
