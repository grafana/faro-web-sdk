import { defaultInternalLoggerLevel, initializeFaro } from '@grafana/faro-core';
import type { Config, Faro } from '@grafana/faro-core';

import { ExtensionErrorsInstrumentation } from './instrumentation';

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

describe('ExtensionErrorsInstrumentation', () => {
  let faro: Faro;
  let errorListeners: Array<(event: ErrorEvent) => void>;
  let rejectionListeners: Array<(event: PromiseRejectionEvent) => void>;

  beforeEach(() => {
    errorListeners = [];
    rejectionListeners = [];

    jest.spyOn(self, 'addEventListener').mockImplementation((type: string, listener: any) => {
      if (type === 'error') {
        errorListeners.push(listener);
      } else if (type === 'unhandledrejection') {
        rejectionListeners.push(listener);
      }
    });

    faro = initializeFaro(
      createTestConfig({
        instrumentations: [new ExtensionErrorsInstrumentation()],
      })
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should register error listener on self', () => {
    expect(self.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should register unhandledrejection listener on self', () => {
    expect(self.addEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
  });

  it('should push error when error event fires', () => {
    const pushErrorSpy = jest.spyOn(faro.api, 'pushError');

    const error = new Error('Test error');
    const errorEvent = { error, message: 'Test error' } as ErrorEvent;

    errorListeners.forEach((listener) => listener(errorEvent));

    expect(pushErrorSpy).toHaveBeenCalledWith(error, expect.objectContaining({ type: 'Error' }));
  });

  it('should push error when unhandledrejection event fires with Error', () => {
    const pushErrorSpy = jest.spyOn(faro.api, 'pushError');

    const error = new Error('Rejected');
    const rejectionEvent = { reason: error } as PromiseRejectionEvent;

    rejectionListeners.forEach((listener) => listener(rejectionEvent));

    expect(pushErrorSpy).toHaveBeenCalledWith(error, expect.objectContaining({ type: 'UnhandledRejection' }));
  });

  it('should push error when unhandledrejection event fires with non-Error', () => {
    const pushErrorSpy = jest.spyOn(faro.api, 'pushError');

    const rejectionEvent = { reason: 'string rejection' } as PromiseRejectionEvent;

    rejectionListeners.forEach((listener) => listener(rejectionEvent));

    expect(pushErrorSpy).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ type: 'UnhandledRejection' })
    );
  });
});
