import { Conventions, EventEvent, initializeFaro, TransportItem } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { createSession } from '../../metas';

import { SessionInstrumentation } from './instrumentation';
import { PersistentSessionsManager } from './sessionManager/PersistentSessionsManager';

describe('SessionInstrumentation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
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

  it('will send session start event if setSession is called in VolatileSessionManager).', () => {
    const transport = new MockTransport();
    const session = createSession({ foo: 'bar' });

    const { api, metas } = initializeFaro(
      mockConfig({
        transports: [transport],
        instrumentations: [new SessionInstrumentation()],
        // Works with the new session config?
        sessionTracking: {
          session,
          enabled: true,
          persistent: false,
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

    event = transport.items[0]! as TransportItem<EventEvent>;
    expect(event.meta.session?.id).toEqual(session.id);
  });

  it('will send session new start event if setSession is called in PersistentSessionManager.', () => {
    const transport = new MockTransport();
    const session = createSession({ foo: 'bar' });

    const { api, metas } = initializeFaro(
      mockConfig({
        transports: [transport],
        instrumentations: [new SessionInstrumentation()],
        // Works with the new session config?
        sessionTracking: {
          enabled: true,
          persistent: true,
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

    event = transport.items[0]! as TransportItem<EventEvent>;
    expect(event.meta.session?.id).toEqual(session.id);
  });

  it('will initialize the new session management if new session handling is enabled.', () => {
    const transport = new MockTransport();
    const session = createSession({ foo: 'bar' });

    const updatePersistentSessionSpy = jest.spyOn(PersistentSessionsManager, 'storeUserSession');

    initializeFaro(
      mockConfig({
        transports: [transport],
        instrumentations: [new SessionInstrumentation()],
        // Works with the new session config?
        sessionTracking: {
          enabled: true,
          persistent: true,
          session,
        },
      })
    );

    // new session manager is initialized hand has stored the initial session
    expect(updatePersistentSessionSpy).toHaveBeenCalledTimes(1);
  });

  it('will not initialize a new session manager if new session handling is disabled.', () => {
    const transport = new MockTransport();
    const session = createSession({ foo: 'bar' });

    const updatePersistentSessionSpy = jest.spyOn(PersistentSessionsManager, 'storeUserSession');

    initializeFaro(
      mockConfig({
        transports: [transport],
        instrumentations: [new SessionInstrumentation()],
        // Works with the new session config?
        sessionTracking: {
          enabled: false,
          persistent: true,
          session,
        },
      })
    );

    // new session manager is NOT initialized hand such has not stored the initial session
    expect(updatePersistentSessionSpy).toHaveBeenCalledTimes(0);
  });
});
