import { isFunction } from '@grafana/faro-core';

import type { MetaSession } from '..';
import type { FaroUserSession } from '../instrumentations/session';
import {
  MAX_SESSION_PERSISTENCE_TIME,
  SESSION_EXPIRATION_TIME,
  SESSION_INACTIVITY_TIME,
  STORAGE_KEY,
} from '../instrumentations/session/sessionManager/sessionManagerUtils';
import { defaultMetas } from '../metas/const';
import * as createSession from '../metas/session';
import * as mockWebStorage from '../utils/webStorage';

import { makeCoreConfig } from './makeCoreConfig';

describe('defaultMetas', () => {
  it('includes K6Meta in defaultMetas for k6 (lab) sessions', () => {
    (global as any).k6 = {};

    const browserConfig = {
      url: 'http://example.com/my-collector',
      app: {},
    };
    const config = makeCoreConfig(browserConfig);

    expect(config).toBeTruthy();
    expect(config?.metas).toHaveLength(3);
    expect(config?.metas.map((item) => (isFunction(item) ? item() : item))).toContainEqual({
      k6: { isK6Browser: true },
    });

    delete (global as any).k6;
  });

  it('does not include K6Meta in defaultMetas for non-k6 (field) sessions', () => {
    expect(defaultMetas).toHaveLength(2);
    expect(defaultMetas.map((item) => (isFunction(item) ? item() : item))).not.toContainEqual({
      k6: { isK6Browser: true },
    });
  });
});

describe('userSessions config', () => {
  const fakeSystemTime = new Date('2023-01-01').getTime();

  let mockStorage: Record<string, string> = {};
  let setItemSpy: jest.SpyInstance<void, [key: string, value: string]>;
  let getItemSpy: jest.SpyInstance<string | null, [key: string]>;
  let removeItemSpy: jest.SpyInstance<void, [key: string]>;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fakeSystemTime);

    setItemSpy = jest.spyOn(global.Storage.prototype, 'setItem').mockImplementation((key, value) => {
      mockStorage[key] = value;
    });

    getItemSpy = jest.spyOn(global.Storage.prototype, 'getItem').mockImplementation((key) => mockStorage[key] ?? null);

    removeItemSpy = jest
      .spyOn(global.Storage.prototype, 'removeItem')
      .mockImplementation((key) => delete mockStorage[key]);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = {};
  });

  afterAll(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();

    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
    removeItemSpy.mockRestore();
  });

  it('creates new session meta for legacy sessions.', () => {
    const mockSessionMeta = { id: 'new-session' };
    jest.spyOn(createSession, 'createSession').mockReturnValueOnce(mockSessionMeta);

    const config = makeCoreConfig({ url: 'http://example.com/my-collector', app: {} });

    expect(config?.session).toStrictEqual(mockSessionMeta);
  });

  it('creates session meta with id and attributes provided via the initial session property.', () => {
    const mockSessionMeta: MetaSession = {
      id: 'new-session',
      attributes: {
        foo: 'bar',
      },
    };

    const config = makeCoreConfig({
      url: 'http://example.com/my-collector',
      app: {},
      sessionTracking: {
        enabled: true,
        session: mockSessionMeta,
      },
    });

    expect(config?.sessionTracking?.session).toStrictEqual(mockSessionMeta);
  });

  it('creates new session meta for browser with no faro session stored in web storage.', () => {
    const mockSessionMeta = { id: 'new-session' };
    jest.spyOn(createSession, 'createSession').mockReturnValueOnce(mockSessionMeta);

    let config = makeCoreConfig({
      url: 'http://example.com/my-collector',
      app: {},
      sessionTracking: {
        enabled: true,
      },
    });

    expect(config?.sessionTracking?.session).toStrictEqual(mockSessionMeta);

    // for persistent sessions
    jest.spyOn(createSession, 'createSession').mockReturnValueOnce(mockSessionMeta);
    config = makeCoreConfig({
      url: 'http://example.com/my-collector',
      app: {},
      sessionTracking: {
        enabled: true,
        persistent: true,
      },
    });

    expect(config?.sessionTracking?.session).toStrictEqual(mockSessionMeta);
  });

  it('creates session meta with id from persisted session for valid tracked session which is within maxSessionPersistenceTime.', () => {
    const mockSessionId = 'new-session';
    const mockAttributes = {
      foo: 'bar',
    };

    mockStorage[STORAGE_KEY] = JSON.stringify({
      sessionId: mockSessionId,
      lastActivity: fakeSystemTime,
      started: fakeSystemTime,
      sessionMeta: {
        id: '123',
        attributes: mockAttributes,
      },
    } as FaroUserSession);

    jest.advanceTimersByTime(SESSION_INACTIVITY_TIME - 1);

    const config = makeCoreConfig({
      url: 'http://example.com/my-collector',
      app: {},
      sessionTracking: {
        enabled: true,
        persistent: true,
      },
    });

    expect(config?.sessionTracking?.session?.id).toBe(mockSessionId);
    expect(config?.sessionTracking?.session?.attributes).toStrictEqual(mockAttributes);
  });

  it('creates new session meta with new sessionId for invalid tracked session which is within maxSessionPersistenceTime.', () => {
    const mockSessionMeta = { id: 'new-session' };
    jest.spyOn(createSession, 'createSession').mockReturnValueOnce(mockSessionMeta);

    mockStorage[STORAGE_KEY] = JSON.stringify({
      sessionId: 'persisted-session',
      lastActivity: fakeSystemTime,
      started: fakeSystemTime,
    } as FaroUserSession);

    jest.advanceTimersByTime(SESSION_EXPIRATION_TIME - 1);

    const config = makeCoreConfig({
      url: 'http://example.com/my-collector',
      app: {},
      sessionTracking: {
        enabled: true,
        persistent: true,
      },
    });

    expect(config?.sessionTracking?.session?.id).toBe(mockSessionMeta.id);
  });

  it('Deletes persisted session if maxSessionPersistenceTime is reached and creates new session meta.', () => {
    const mockSessionMeta = { id: 'new-session' };
    jest.spyOn(createSession, 'createSession').mockReturnValueOnce(mockSessionMeta);
    jest.spyOn(mockWebStorage, 'isWebStorageAvailable').mockReturnValueOnce(true);

    mockStorage[STORAGE_KEY] = JSON.stringify({
      sessionId: 'persisted-session',
      lastActivity: fakeSystemTime,
      started: fakeSystemTime,
    } as FaroUserSession);

    jest.advanceTimersByTime(MAX_SESSION_PERSISTENCE_TIME);

    const config = makeCoreConfig({
      url: 'http://example.com/my-collector',
      app: {},
      sessionTracking: {
        enabled: true,
        persistent: true,
      },
    });

    expect(mockStorage[STORAGE_KEY]).toBeUndefined();

    expect(config?.sessionTracking?.session?.id).toBe(mockSessionMeta.id);
  });
});
