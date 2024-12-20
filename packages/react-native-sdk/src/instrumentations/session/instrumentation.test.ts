import {
  dateNow,
  EVENT_SESSION_EXTEND,
  EVENT_SESSION_RESUME,
  EVENT_SESSION_START,
  initializeFaro,
} from '@grafana/faro-core';
import type { EventEvent, MetaSession, TransportItem } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { makeCoreConfig } from '../../config/makeCoreConfig';
import { createSession } from '../../metas/session';
import * as createSessionMock from '../../metas/session';

import { SessionInstrumentation } from './instrumentation';
import {
  FaroUserSession,
  MAX_SESSION_PERSISTENCE_TIME,
  SESSION_EXPIRATION_TIME,
  SESSION_INACTIVITY_TIME,
  STORAGE_KEY,
} from './sessionManager';
import * as samplingModuleMock from './sessionManager/sampling';
import { createUserSessionObject } from './sessionManager/sessionManagerUtils';

describe('SessionInstrumentation', () => {
  let mockStorage: Record<string, string> = {};
  let setItemSpy: jest.SpyInstance<void, [key: string, value: string]>;
  let getItemSpy: jest.SpyInstance<string | null, [key: string]>;
  let removeItemSpy: jest.SpyInstance<void, [key: string]>;

  beforeAll(() => {
    jest.useFakeTimers();
    setItemSpy = jest.spyOn(global.Storage.prototype, 'setItem').mockImplementation((key, value) => {
      mockStorage[key] = value;
    });

    getItemSpy = jest.spyOn(global.Storage.prototype, 'getItem').mockImplementation((key) => mockStorage[key] ?? null);

    removeItemSpy = jest.spyOn(global.Storage.prototype, 'removeItem').mockImplementation((key) => {
      delete mockStorage[key];
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.spyOn(samplingModuleMock, 'isSampled').mockRestore();
    mockStorage = {};
  });

  afterAll(() => {
    jest.useRealTimers();
    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
    removeItemSpy.mockRestore();
  });

  it('will send session start event on initialize.', () => {
    const transport = new MockTransport();
    const session = createSession({ foo: 'bar' });

    initializeFaro(
      mockConfig({
        transports: [transport],
        instrumentations: [new SessionInstrumentation()],
        sessionTracking: {
          enabled: true,
          session,
        },
      })
    );

    expect(transport.items).toHaveLength(1);

    const event = transport.items[0]! as TransportItem<EventEvent>;
    expect(event.payload.name).toEqual(EVENT_SESSION_START);
    expect(event.meta.session?.attributes).toEqual({ foo: 'bar' });
    expect(event.meta.session?.id).toEqual(session.id);
  });

  it('will send session start event for new session.', () => {
    const transport = new MockTransport();
    const session = createSession({ foo: 'bar' });

    const config = mockConfig({
      transports: [transport],
      instrumentations: [new SessionInstrumentation()],
      sessionTracking: {
        enabled: true,
        persistent: false,
        session,
        samplingRate: 1,
      },
    });

    const { api, metas } = initializeFaro(config);

    expect(transport.items).toHaveLength(1);

    let event = transport.items[0]! as TransportItem<EventEvent>;
    expect(event.payload.name).toEqual(EVENT_SESSION_START);
    expect(event.meta.session?.id).toEqual(session.id);

    metas.add({ user: { id: 'foo' } });
    expect(transport.items).toHaveLength(1);

    const newSession = createSession();
    api.setSession(newSession);
    expect(transport.items).toHaveLength(2);
    expect(event.payload.name).toEqual(EVENT_SESSION_START);

    event = transport.items[1]! as TransportItem<EventEvent>;
    expect(event.meta.session?.id).toEqual(newSession.id);
  });

  it('will send session_resume event if valid user-session exists in web storage.', () => {
    const transport = new MockTransport();

    const mockNewSessionId = '123';
    mockStorage[STORAGE_KEY] = JSON.stringify(createUserSessionObject({ sessionId: mockNewSessionId }));

    initializeFaro(
      mockConfig({
        transports: [transport],
        instrumentations: [new SessionInstrumentation()],
        sessionTracking: {
          enabled: true,
          samplingRate: 1, // default
        },
      })
    );

    expect(transport.items).toHaveLength(1);

    let event = transport.items[0]! as TransportItem<EventEvent>;
    expect(event.payload.name).toEqual(EVENT_SESSION_RESUME);
  });

  it('will send session_extend event if a new session is crated by Faro or manually.', () => {
    const transport = new MockTransport();

    const mockNewSessionId = '123';
    const mockUserSession = createUserSessionObject({ sessionId: mockNewSessionId });

    mockStorage[STORAGE_KEY] = JSON.stringify(mockUserSession);

    const { api } = initializeFaro(
      mockConfig({
        transports: [transport],
        instrumentations: [new SessionInstrumentation()],
        sessionTracking: {
          enabled: true,
          persistent: true,
          samplingRate: 1, // default
        },
      })
    );

    expect(transport.items).toHaveLength(1);

    let event = transport.items[0]! as TransportItem<EventEvent>;
    expect(event.payload.name).toEqual(EVENT_SESSION_RESUME);

    jest.advanceTimersByTime(SESSION_EXPIRATION_TIME + 1);

    api.pushLog(['advanceTimersByTime']);

    expect(transport.items).toHaveLength(3);
    // extending the session happens before the event is sent, we look at the second item
    event = transport.items[1]! as TransportItem<EventEvent>;
    expect(event.payload.name).toEqual(EVENT_SESSION_EXTEND);

    api.setSession({ id: '456' });

    expect(transport.items).toHaveLength(4);
    event = transport.items[3]! as TransportItem<EventEvent>;
    expect(event.payload.name).toEqual(EVENT_SESSION_EXTEND);
  });

  it('Initialize session meta with user defined id and attributes provided via the initial session property.', () => {
    const mockSessionMeta: MetaSession = {
      id: 'new-session',
      attributes: {
        foo: 'bar',
        isSampled: 'true',
      },
    };

    const { metas } = initializeFaro(
      mockConfig({
        instrumentations: [new SessionInstrumentation()],
        sessionTracking: {
          enabled: true,
          session: mockSessionMeta,
          samplingRate: 1, // default
        },
      })
    );

    expect(metas.value.session).toStrictEqual(mockSessionMeta);

    const sessionFromStorage: FaroUserSession = JSON.parse(mockStorage[STORAGE_KEY]!);

    expect(sessionFromStorage).toStrictEqual({
      sessionId: 'new-session',
      isSampled: true,

      // lastActivity and started values are not important for this test so it's ok to take them form the object we verify.
      lastActivity: sessionFromStorage.lastActivity,
      started: sessionFromStorage.started,

      sessionMeta: {
        id: 'new-session',
        attributes: {
          foo: 'bar',

          // Faro doesn't care about the isSampled value in the meta form localStorage. But it's not worthy to remove it tbh.
          isSampled: 'true',
        },
      },
    });
  });

  it('Adds user defined attributes to the extended session meta.', () => {
    const mockSessionMeta: MetaSession = {
      id: 'new-session',
      attributes: {
        foo: 'bar',
        isSampled: 'true',
      },
    };

    const { api, metas } = initializeFaro(
      mockConfig({
        instrumentations: [new SessionInstrumentation()],
        sessionTracking: {
          enabled: true,
          session: mockSessionMeta,
          samplingRate: 1, // default
        },
      })
    );

    expect(metas.value.session).toStrictEqual(mockSessionMeta);

    expect(metas.value.session).toStrictEqual({
      ...mockSessionMeta,
      attributes: {
        ...mockSessionMeta.attributes,
      },
    });

    let sessionFromStorage: FaroUserSession = JSON.parse(mockStorage[STORAGE_KEY]!);

    expect(sessionFromStorage).toStrictEqual({
      sessionId: 'new-session',
      isSampled: true,

      // lastActivity and started values are not important for this test so it's ok to take them form the object we verify.
      lastActivity: sessionFromStorage.lastActivity,
      started: sessionFromStorage.started,

      sessionMeta: {
        id: 'new-session',
        attributes: {
          foo: 'bar',
          isSampled: 'true',
        },
      },
    });

    api.setSession({ id: 'extended-session-id', attributes: { location: 'neptun', foo: 'abc' } });

    expect(metas.value.session).toStrictEqual({
      id: 'extended-session-id',
      attributes: {
        ...mockSessionMeta.attributes,
        location: 'neptun',
        foo: 'abc',
        previousSession: 'new-session',
      },
    });

    sessionFromStorage = JSON.parse(mockStorage[STORAGE_KEY]!);

    expect(sessionFromStorage).toStrictEqual({
      sessionId: 'extended-session-id',
      isSampled: true,

      // lastActivity and started values are not important for this test so it's ok to take them form the object we verify.
      lastActivity: sessionFromStorage.lastActivity,
      started: sessionFromStorage.started,

      sessionMeta: {
        id: 'extended-session-id',
        attributes: {
          location: 'neptun',
          foo: 'abc',
          previousSession: 'new-session',
          isSampled: 'true',
        },
      },
    });
  });

  it('Initialize session meta with meta attributes from session picked up from web storage.', () => {
    const mockSessionMeta: MetaSession = {
      id: 'new-session',
      attributes: {
        foo: 'bar',
        location: 'mars',
        isSampled: 'true',
      },
    };

    mockStorage[STORAGE_KEY] = JSON.stringify({
      sessionId: mockSessionMeta.id,
      sessionMeta: mockSessionMeta,
    } as FaroUserSession);

    const { metas } = initializeFaro(
      mockConfig({
        instrumentations: [new SessionInstrumentation()],
        sessionTracking: {
          enabled: true,
          session: mockSessionMeta,
          samplingRate: 1, // default
        },
      })
    );

    expect(metas.value.session).toStrictEqual(mockSessionMeta);
  });

  it('creates new session meta for browser with no faro session stored in web storage.', () => {
    const mockSessionMeta = { id: 'new-session', attributes: { isSampled: 'true' } };
    jest.spyOn(createSessionMock, 'createSession').mockReturnValueOnce(mockSessionMeta);

    const { metas } = initializeFaro(
      mockConfig({
        instrumentations: [new SessionInstrumentation()],
        sessionTracking: {
          enabled: true,
          samplingRate: 1, // default
        },
      })
    );

    expect(metas.value.session).toStrictEqual(mockSessionMeta);
  });

  it('creates session meta with id from persisted session for valid tracked session which is within maxSessionPersistenceTime.', () => {
    const mockUserSession = createUserSessionObject({ sessionId: 'persisted-session' });
    mockUserSession.sessionMeta = {
      id: 'persisted-session',
      attributes: {
        foo: 'bar',
        isSampled: 'true',
      },
    };

    mockStorage[STORAGE_KEY] = JSON.stringify(mockUserSession);

    jest.advanceTimersByTime(SESSION_INACTIVITY_TIME - 1);

    const config = makeCoreConfig(
      mockConfig({
        instrumentations: [new SessionInstrumentation()],
        sessionTracking: {
          enabled: true,
          persistent: true,
          samplingRate: 1, // default
        },
      })
    );
    const { metas } = initializeFaro(config!);

    expect(metas.value.session?.id).toBe(mockUserSession.sessionId);
    expect(metas.value.session?.attributes).toStrictEqual(mockUserSession.sessionMeta.attributes);
  });

  it('creates new session meta with new sessionId for invalid tracked session which is within maxSessionPersistenceTime.', () => {
    const started = dateNow();
    const mockUserSession = createUserSessionObject({ sessionId: 'persisted-session', started });
    mockUserSession.sessionMeta = {
      id: 'persisted-session',
    };

    mockStorage[STORAGE_KEY] = JSON.stringify(mockUserSession);

    jest.advanceTimersByTime(MAX_SESSION_PERSISTENCE_TIME);

    const config = makeCoreConfig(
      mockConfig({
        instrumentations: [new SessionInstrumentation()],
        sessionTracking: {
          enabled: true,
          persistent: true,
          samplingRate: 1, // default
        },
      })
    );

    const { metas } = initializeFaro(config!);

    expect(removeItemSpy).toBeCalledTimes(0);
    expect(metas.value.session?.id).not.toBe(mockUserSession.sessionId);

    const sessionFromStorage: FaroUserSession = JSON.parse(mockStorage[STORAGE_KEY]);
    // creates new started timestamp
    expect(sessionFromStorage.started).not.toBe(started);
  });

  it('Deletes persisted session if maxSessionPersistenceTime is reached and creates new session meta.', () => {
    const mockUserSession = createUserSessionObject({ sessionId: 'persisted-session' });
    mockUserSession.sessionMeta = {
      id: 'persisted-session',
    };

    mockStorage[STORAGE_KEY] = JSON.stringify(mockUserSession);

    jest.advanceTimersByTime(MAX_SESSION_PERSISTENCE_TIME + 1);

    const config = makeCoreConfig(
      mockConfig({
        instrumentations: [new SessionInstrumentation()],
        sessionTracking: {
          enabled: true,
          persistent: true,
          samplingRate: 1, // default
        },
      })
    );

    const { metas } = initializeFaro(config!);

    expect(removeItemSpy).toBeCalledTimes(1);
    expect(metas.value.session?.id).not.toBe(mockUserSession.sessionId);
  });

  it('Removes items which are not part of the sample.', () => {
    const transport = new MockTransport();

    jest.spyOn(samplingModuleMock, 'isSampled').mockReturnValue(true);

    const { api } = initializeFaro(
      mockConfig({
        transports: [transport],
        instrumentations: [new SessionInstrumentation()],
      })
    );

    expect(transport.items).toHaveLength(1);
    api.pushLog(['abc']);

    expect(transport.items).toHaveLength(2);
    api.pushEvent('def');

    expect(transport.items).toHaveLength(3);

    jest.spyOn(samplingModuleMock, 'isSampled').mockReturnValueOnce(false);
    api.setSession({ id: 'second-session-with-sampling-set-to-false' });
    expect(transport.items).toHaveLength(3);

    api.pushLog(['this log should not be sent']);
    expect(transport.items).toHaveLength(3);
  });

  it('Will use sampling decision from valid session from web storage.', () => {
    const initialIsSampled = true;
    const mockUserSession = createUserSessionObject({
      sessionId: 'persisted-session-ac',
      isSampled: initialIsSampled,
    });

    mockStorage[STORAGE_KEY] = JSON.stringify(mockUserSession);

    const config = makeCoreConfig(
      mockConfig({
        instrumentations: [new SessionInstrumentation()],
        sessionTracking: {
          enabled: true,
          persistent: true,
          samplingRate: 0,
        },
      })
    );

    const { api } = initializeFaro(config!);
    const sessionMeta = api.getSession();

    expect(sessionMeta?.attributes?.['isSampled']).toBe(initialIsSampled.toString());
    expect((JSON.parse(mockStorage[STORAGE_KEY]) as FaroUserSession).isSampled).toBe(initialIsSampled);
  });

  it('Will calculate new sampling decision if session from web storage is invalid.', () => {
    const initialIsSampled = true;
    const mockUserSession = createUserSessionObject({
      sessionId: 'persisted-session-ac',
      isSampled: initialIsSampled,
    });

    mockUserSession.lastActivity = dateNow() - SESSION_EXPIRATION_TIME;

    mockStorage[STORAGE_KEY] = JSON.stringify(mockUserSession);

    const config = makeCoreConfig(
      mockConfig({
        instrumentations: [new SessionInstrumentation()],
        sessionTracking: {
          enabled: true,
          persistent: true,
          samplingRate: 0, // setting to zero so calculating sampling decision for new session will evaluate to false
        },
      })
    );

    const { api } = initializeFaro(config!);
    const sessionMeta = api.getSession();

    expect(sessionMeta?.attributes?.['isSampled']).toBe('false');
    expect((JSON.parse(mockStorage[STORAGE_KEY]) as FaroUserSession).isSampled).toBe(false);
  });

  it('Will send 0% of the signals.', () => {
    const transport = new MockTransport();

    const config = makeCoreConfig(
      mockConfig({
        transports: [transport],
        instrumentations: [new SessionInstrumentation()],
        sessionTracking: {
          enabled: true,
          samplingRate: 0,
        },
        batching: {
          itemLimit: 5,
          sendTimeout: 1,
        },
      })
    );

    const { api } = initializeFaro(config!);

    const sentItems = transport.items;

    // starting at two because a session lifetime event is automatically sent by Faro
    api.pushEvent('two');
    api.pushEvent('three');
    api.pushEvent('four');
    api.pushEvent('five');

    expect(sentItems).toHaveLength(0);
  });

  it('Will send 100% of the signals.', () => {
    const transport = new MockTransport();

    const config = makeCoreConfig(
      mockConfig({
        transports: [transport],
        instrumentations: [new SessionInstrumentation()],
        sessionTracking: {
          enabled: true,
          samplingRate: 1,
        },
        batching: {
          itemLimit: 5,
          sendTimeout: 1,
        },
      })
    );

    const { api } = initializeFaro(config!);

    const sentItems = transport.items;

    // starting at two because a session lifetime event is automatically sent by Faro
    api.pushEvent('two');
    api.pushEvent('three');
    api.pushEvent('four');
    api.pushEvent('five');

    expect(sentItems).toHaveLength(5);

    // Are all isSampled attributes removed?
    expect(sentItems.every((item) => typeof item.meta.session?.attributes?.['isSampled'] === 'undefined')).toBe(true);
  });

  it('Will drop signals for new session which is not part of the sample.', () => {
    const transport = new MockTransport();

    const config = makeCoreConfig(
      mockConfig({
        transports: [transport],
        instrumentations: [new SessionInstrumentation()],
        sessionTracking: {
          enabled: true,
          session: { id: 'abc', attributes: { foo: 'bar' } },
        },
        batching: {
          itemLimit: 5,
          sendTimeout: 1,
        },
      })
    );

    const { api } = initializeFaro(config!);
    const sentItems = transport.items;

    // starting at two because a session lifetime event is automatically sent by Faro
    api.pushEvent('two');
    api.pushEvent('three');

    jest.spyOn(samplingModuleMock, 'isSampled').mockReturnValue(false);
    api.setSession();

    api.pushEvent('four');
    api.pushEvent('five');
    api.pushEvent('six');

    expect(sentItems).toHaveLength(3);

    // Are all isSampled attributes removed?
    expect(sentItems.every((item) => typeof item.meta.session?.attributes?.['isSampled'] === 'undefined')).toBe(true);

    // Are all other attributes retained?
    expect(sentItems.every((item) => item.meta.session?.attributes?.['foo'] === 'bar')).toBe(true);
  });

  it('Keep value started timestamp for resumed sessions.', () => {
    const transport = new MockTransport();

    const sessionId = '123';
    const started = dateNow() - 5 * 60 * 1000;

    mockStorage[STORAGE_KEY] = JSON.stringify(
      createUserSessionObject({
        sessionId,
        started,
      })
    );

    initializeFaro(
      mockConfig({
        transports: [transport],
        instrumentations: [new SessionInstrumentation()],
        sessionTracking: {
          enabled: true,
        },
      })
    );

    const sessionFromStorage: FaroUserSession = JSON.parse(mockStorage[STORAGE_KEY]);

    expect(sessionFromStorage.sessionId).toBe(sessionId);
    expect(sessionFromStorage.started).toBe(started);
  });

  it('Removes is sampled attribute before transport item is sent.', () => {
    const mockNewSessionId = '123';

    const transport = new MockTransport();

    initializeFaro(
      mockConfig({
        transports: [transport],
        instrumentations: [new SessionInstrumentation()],
        sessionTracking: {
          enabled: true,
          samplingRate: 1,
          session: { id: mockNewSessionId, attributes: { foo: 'bar' } },
        },
      })
    );

    expect(transport.items).toHaveLength(1);

    const event = transport.items[0]! as TransportItem<EventEvent>;
    expect(event.payload.name).toEqual(EVENT_SESSION_START);
    expect(event.meta.session).toStrictEqual({
      id: mockNewSessionId,
      attributes: {
        foo: 'bar',
      },
    });
  });
});
