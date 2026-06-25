import type { BrowserConfig } from './config';
import { initializeFaro } from './initialize';
import * as remoteConfig from './remoteConfig';

function makeConfig(overrides: Partial<BrowserConfig> = {}): BrowserConfig {
  return {
    url: 'https://collector.example.com/collect/abc123',
    app: { name: 'test', version: '1.0.0' },
    isolate: true,
    preventGlobalExposure: true,
    instrumentations: [],
    ...overrides,
  };
}

describe('initializeFaro remote config wiring', () => {
  let prepareSpy: jest.SpyInstance;
  let engageSpy: jest.SpyInstance;
  const fetchMock = jest.fn(() => Promise.reject(new Error('should not fetch')));
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.localStorage.clear();
    fetchMock.mockClear();
    global.fetch = fetchMock as any;
    prepareSpy = jest.spyOn(remoteConfig, 'prepareRemoteConfig');
    engageSpy = jest.spyOn(remoteConfig, 'engageRemoteConfig').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('does not engage remote config and never fetches when remoteConfig is absent', () => {
    const faro = initializeFaro(makeConfig());

    expect(faro).toBeDefined();
    expect(prepareSpy).not.toHaveBeenCalled();
    expect(engageSpy).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns synchronously and engages remote config when enabled', () => {
    const faro = initializeFaro(makeConfig({ remoteConfig: {} }));

    // synchronous: a Faro instance is returned immediately, not a Promise
    expect(faro).toBeDefined();
    expect(typeof (faro as unknown as Promise<unknown>).then).not.toBe('function');

    expect(prepareSpy).toHaveBeenCalledTimes(1);
    expect(engageSpy).toHaveBeenCalledTimes(1);
  });
});
