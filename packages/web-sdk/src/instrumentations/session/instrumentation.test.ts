import { Conventions, EventEvent, initializeFaro, TransportItem } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { createSession } from '../../metas';

import { SessionInstrumentation } from './instrumentation';
import * as sessionHandler from './sessionHandler';

describe('SessionInstrumentation', () => {
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

  it('will send session new start event if setSession is called (for in-memory sessions).', () => {
    const transport = new MockTransport();
    const session = createSession({ foo: 'bar' });

    const { api, metas } = initializeFaro(
      mockConfig({
        transports: [transport],
        instrumentations: [new SessionInstrumentation()],
        // Works with the new session config?
        session,
        experimentalSessions: {
          enabled: true,
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

  it('will send session new start event if setSession is called (for persistent sessions).', () => {
    const transport = new MockTransport();
    const session = createSession({ foo: 'bar' });

    const { api, metas } = initializeFaro(
      mockConfig({
        transports: [transport],
        instrumentations: [new SessionInstrumentation()],
        // Works with the new session config?
        experimentalSessions: {
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

  it('will initialize new session manager if manager if new session handling is enabled.', () => {
    const transport = new MockTransport();
    const session = createSession({ foo: 'bar' });

    const mockGetSessionUpdater = {
      handleUpdate: jest.fn(),
      init: jest.fn(),
    };

    jest.spyOn(sessionHandler, 'getSessionUpdater').mockImplementationOnce(() => mockGetSessionUpdater);

    initializeFaro(
      mockConfig({
        transports: [transport],
        instrumentations: [new SessionInstrumentation()],
        // Works with the new session config?
        experimentalSessions: {
          enabled: true,
          persistent: true,
          session,
        },
      })
    );

    expect(mockGetSessionUpdater.init).toBeCalledTimes(1);
    expect(mockGetSessionUpdater.handleUpdate).toBeCalledTimes(0);
  });

  it('will not initialize a new session manager if new session handling is disabled.', () => {
    const transport = new MockTransport();
    const session = createSession({ foo: 'bar' });

    const mockGetSessionUpdater = jest.fn();
    jest.spyOn(sessionHandler, 'getSessionUpdater').mockImplementationOnce(mockGetSessionUpdater);

    initializeFaro(
      mockConfig({
        transports: [transport],
        instrumentations: [new SessionInstrumentation()],
        // Works with the new session config?
        experimentalSessions: {
          enabled: false,
          persistent: true,
          session,
        },
      })
    );

    expect(mockGetSessionUpdater).toBeCalledTimes(0);
  });
});
