import { Conventions, initializeFaro, MetaSession } from '@grafana/faro-core';
import type { EventEvent, TransportItem } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { createSession } from '../../metas/session';
import * as createSessionMock from '../../metas/session';

import { SessionInstrumentation } from './instrumentation';
import type { FaroUserSession } from './sessionManager';
import {
  createUserSessionObject,
  SESSION_EXPIRATION_TIME,
  SESSION_INACTIVITY_TIME,
  STORAGE_KEY,
} from './sessionManager/sessionManagerUtils';

describe('SessionInstrumentation', () => {
  let mockStorage: Record<string, string> = {};
  let setItemSpy: jest.SpyInstance<void, [key: string, value: string]>;
  let getItemSpy: jest.SpyInstance<string | null, [key: string]>;

  const fakeSystemTime = new Date('2023-01-01').getTime();

  beforeAll(() => {
    setItemSpy = jest.spyOn(global.Storage.prototype, 'setItem').mockImplementation((key, value) => {
      mockStorage[key] = value;
    });

    getItemSpy = jest.spyOn(global.Storage.prototype, 'getItem').mockImplementation((key) => mockStorage[key] ?? null);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockStorage = {};
    mockStorage = {};
  });

  afterAll(() => {
    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  it('will send session start event on initialize', () => {
    const transport = new MockTransport();
    const session = createSession({ foo: 'bar' });

    initializeFaro(
      mockConfig({
        transports: [transport],
        instrumentations: [new SessionInstrumentation()],
        session,
      })
    );

    expect(transport.items).toHaveLength(1);

    const event = transport.items[0]! as TransportItem<EventEvent>;
    expect(event.payload.name).toEqual(Conventions.EventNames.SESSION_START);
    expect(event.meta.session?.attributes).toEqual({ foo: 'bar' });
    expect(event.meta.session?.id).toEqual(session.id);
  });

  it('will send session start event for new session and if setSession is called in VolatileSessionManager).', () => {
    const transport = new MockTransport();
    const session = createSession({ foo: 'bar' });

    const { api, metas } = initializeFaro(
      mockConfig({
        transports: [transport],
        instrumentations: [new SessionInstrumentation()],
        sessionTracking: {
          enabled: true,
          persistent: false,
          session,
        },
      })
    );

    expect(transport.items).toHaveLength(1);

    let event = transport.items[0]! as TransportItem<EventEvent>;
    expect(event.payload.name).toEqual(Conventions.EventNames.SESSION_START);
    expect(event.meta.session?.id).toEqual(session.id);

    metas.add({ user: { id: 'foo' } });
    expect(transport.items).toHaveLength(1);

    const newSession = createSession();
    api.setSession(newSession);
    expect(transport.items).toHaveLength(2);
    expect(event.payload.name).toEqual(Conventions.EventNames.SESSION_START);

    event = transport.items[1]! as TransportItem<EventEvent>;
    expect(event.meta.session?.id).toEqual(newSession.id);
  });

  it('will send session_resume event if valid user-session exists in web storage.', () => {
    const transport = new MockTransport();

    const mockNewSessionId = '123';
    mockStorage[STORAGE_KEY] = JSON.stringify(createUserSessionObject(mockNewSessionId));

    initializeFaro(
      mockConfig({
        transports: [transport],
        instrumentations: [new SessionInstrumentation()],
        sessionTracking: {
          enabled: true,
        },
      })
    );

    expect(transport.items).toHaveLength(1);

    let event = transport.items[0]! as TransportItem<EventEvent>;
    expect(event.payload.name).toEqual('session_resume');
  });

  it('will send session_extend event if a new session is crated by Faro or manually.', () => {
    jest.useFakeTimers();
    jest.setSystemTime(fakeSystemTime);

    const transport = new MockTransport();

    const mockNewSessionId = '123';
    const mockUserSession = createUserSessionObject(mockNewSessionId);

    mockStorage[STORAGE_KEY] = JSON.stringify(mockUserSession);

    const { api } = initializeFaro(
      mockConfig({
        transports: [transport],
        instrumentations: [new SessionInstrumentation()],
        sessionTracking: {
          enabled: true,
          persistent: true,
        },
      })
    );

    expect(transport.items).toHaveLength(1);

    let event = transport.items[0]! as TransportItem<EventEvent>;
    expect(event.payload.name).toEqual('session_resume');

    jest.advanceTimersByTime(SESSION_EXPIRATION_TIME + 1);
    api.pushLog(['advanceTimersByTime']);

    expect(transport.items).toHaveLength(3);
    // extending the session happens before the event is sent, we look at the second item
    event = transport.items[1]! as TransportItem<EventEvent>;
    expect(event.payload.name).toEqual('session_extend');

    api.setSession({ id: '456' });

    expect(transport.items).toHaveLength(4);
    event = transport.items[3]! as TransportItem<EventEvent>;
    expect(event.payload.name).toEqual('session_extend');
  });

  it('Initialize session meta with id and attributes provided via the initial session property.', () => {
    const mockSessionMeta: MetaSession = {
      id: 'new-session',
      attributes: {
        foo: 'bar',
      },
    };

    const { metas } = initializeFaro(
      mockConfig({
        instrumentations: [new SessionInstrumentation()],
        sessionTracking: {
          enabled: true,
          session: mockSessionMeta,
        },
      })
    );

    expect(metas.value.session).toStrictEqual(mockSessionMeta);
  });

  it('creates new session meta for browser with no faro session stored in web storage.', () => {
    const mockSessionMeta = { id: 'new-session' };
    jest.spyOn(createSessionMock, 'createSession').mockReturnValueOnce(mockSessionMeta);

    const { metas } = initializeFaro(
      mockConfig({
        instrumentations: [new SessionInstrumentation()],
        sessionTracking: {
          enabled: true,
          session: mockSessionMeta,
        },
      })
    );

    expect(metas.value.session).toStrictEqual(mockSessionMeta);
  });

  it('creates session meta with id from persisted session for valid tracked session which is within maxSessionPersistenceTime.', () => {
    const mockUserSession = {
      sessionId: 'new-session',
      lastActivity: fakeSystemTime,
      started: fakeSystemTime,
      sessionMeta: {
        id: 'new-session',
        attributes: {
          foo: 'bar',
        },
      },
    };

    mockStorage[STORAGE_KEY] = JSON.stringify(mockUserSession);

    jest.advanceTimersByTime(SESSION_INACTIVITY_TIME - 1);

    // const config = makeCoreConfig({
    //   url: 'http://example.com/my-collector',
    //   app: {},
    //   sessionTracking: {
    //     enabled: true,
    //     persistent: true,
    //   },
    // });

    const { metas } = initializeFaro(
      mockConfig({
        instrumentations: [new SessionInstrumentation()],
        sessionTracking: {
          enabled: true,
          persistent: true,
        },
      })
    );

    expect(metas.value.session?.id).toBe(mockUserSession.sessionId);
    expect(metas.value.session?.attributes).toStrictEqual(mockUserSession.sessionMeta.attributes);
  });
});

// describe.skip('SessionInstrumentation: userSessions config', () => {
//   const fakeSystemTime = new Date('2023-01-01').getTime();

//   it('creates new session meta with new sessionId for invalid tracked session which is within maxSessionPersistenceTime.', () => {
//     const mockSessionMeta = { id: 'new-session' };
//     jest.spyOn(createSession, 'createSession').mockReturnValueOnce(mockSessionMeta);

//     mockStorage[STORAGE_KEY] = JSON.stringify({
//       sessionId: 'persisted-session',
//       lastActivity: fakeSystemTime,
//       started: fakeSystemTime,
//     } as FaroUserSession);

//     jest.advanceTimersByTime(SESSION_EXPIRATION_TIME - 1);

//     const config = makeCoreConfig({
//       url: 'http://example.com/my-collector',
//       app: {},
//       sessionTracking: {
//         enabled: true,
//         persistent: true,
//       },
//     });

//     expect(config?.sessionTracking?.session?.id).toBe(mockSessionMeta.id);
//   });

//   it('Deletes persisted session if maxSessionPersistenceTime is reached and creates new session meta.', () => {
//     const mockSessionMeta = { id: 'new-session' };
//     jest.spyOn(createSession, 'createSession').mockReturnValueOnce(mockSessionMeta);
//     jest.spyOn(mockWebStorage, 'isWebStorageAvailable').mockReturnValueOnce(true);

//     mockStorage[STORAGE_KEY] = JSON.stringify({
//       sessionId: 'persisted-session',
//       lastActivity: fakeSystemTime,
//       started: fakeSystemTime,
//     } as FaroUserSession);

//     jest.advanceTimersByTime(MAX_SESSION_PERSISTENCE_TIME);

//     const config = makeCoreConfig({
//       url: 'http://example.com/my-collector',
//       app: {},
//       sessionTracking: {
//         enabled: true,
//         persistent: true,
//       },
//     });

//     expect(mockStorage[STORAGE_KEY]).toBeUndefined();

//     expect(config?.sessionTracking?.session?.id).toBe(mockSessionMeta.id);
//   });
// });
