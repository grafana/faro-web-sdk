import { defaultInternalLoggerLevel, initializeFaro } from '@grafana/faro-core';
import type { Config } from '@grafana/faro-core';

import { ExtensionSessionInstrumentation } from './instrumentation';

function createMockTransport() {
  return {
    name: 'test-transport',
    version: '1.0.0',
    getIgnoreUrls: () => [],
    isBatched: () => false,
    send: jest.fn().mockResolvedValue(undefined),
  } as any;
}

function createTestConfig(overrides: Partial<Config> = {}): Config {
  return {
    app: { name: 'test-extension', version: '1.0.0' },
    dedupe: true,
    globalObjectKey: 'faro',
    internalLoggerLevel: defaultInternalLoggerLevel,
    instrumentations: [],
    isolate: true,
    metas: [],
    parseStacktrace: () => ({ frames: [] }),
    paused: false,
    preventGlobalExposure: true,
    transports: [createMockTransport()],
    unpatchedConsole: console,
    batching: { enabled: false },
    ...overrides,
  };
}

describe('ExtensionSessionInstrumentation', () => {
  let mockStorage: Record<string, string>;

  beforeEach(() => {
    mockStorage = {};

    (globalThis as any).chrome = {
      storage: {
        local: {
          get: jest.fn().mockImplementation((key: string) => {
            return Promise.resolve({ [key]: mockStorage[key] ?? undefined });
          }),
          set: jest.fn().mockImplementation((items: Record<string, string>) => {
            Object.assign(mockStorage, items);
            return Promise.resolve();
          }),
          remove: jest.fn().mockImplementation((key: string) => {
            delete mockStorage[key];
            return Promise.resolve();
          }),
        },
      },
      runtime: {
        id: 'test-extension-id',
        getManifest: () => ({ name: 'Test Extension', version: '1.0.0' }),
      },
    };
  });

  afterEach(() => {
    delete (globalThis as any).chrome;
    jest.restoreAllMocks();
  });

  it('should create a new session when no stored session exists', async () => {
    initializeFaro(
      createTestConfig({
        instrumentations: [new ExtensionSessionInstrumentation()],
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(chrome.storage.local.set).toHaveBeenCalled();
    expect(chrome.storage.local.get).toHaveBeenCalledWith('com.grafana.faro.session');
  });

  it('should resume a valid stored session', async () => {
    const now = Date.now();
    const existingSession = JSON.stringify({
      sessionId: 'existing-session-id',
      lastActivity: now - 1000,
      started: now - 5000,
      isSampled: true,
      sessionMeta: {
        id: 'existing-session-id',
        attributes: { isSampled: 'true' },
      },
    });

    mockStorage['com.grafana.faro.session'] = existingSession;

    initializeFaro(
      createTestConfig({
        instrumentations: [new ExtensionSessionInstrumentation()],
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(chrome.storage.local.get).toHaveBeenCalledWith('com.grafana.faro.session');

    const setCalls = (chrome.storage.local.set as jest.Mock).mock.calls;
    expect(setCalls.length).toBeGreaterThan(0);
    const storedData = JSON.parse(setCalls[setCalls.length - 1]![0]['com.grafana.faro.session']);
    expect(storedData.sessionId).toBe('existing-session-id');
  });

  it('should create new session when stored session is expired', async () => {
    const now = Date.now();
    const expiredSession = JSON.stringify({
      sessionId: 'expired-session-id',
      lastActivity: now - 5 * 60 * 60 * 1000,
      started: now - 5 * 60 * 60 * 1000,
      isSampled: true,
      sessionMeta: {
        id: 'expired-session-id',
        attributes: { isSampled: 'true' },
      },
    });

    mockStorage['com.grafana.faro.session'] = expiredSession;

    initializeFaro(
      createTestConfig({
        instrumentations: [new ExtensionSessionInstrumentation()],
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    const setCalls = (chrome.storage.local.set as jest.Mock).mock.calls;
    const lastSetCall = setCalls[setCalls.length - 1]?.[0];
    if (lastSetCall) {
      const storedData = JSON.parse(lastSetCall['com.grafana.faro.session']);
      expect(storedData.sessionId).not.toBe('expired-session-id');
    }
  });
});
