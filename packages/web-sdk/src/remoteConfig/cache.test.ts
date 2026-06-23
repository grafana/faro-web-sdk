import { mockInternalLogger } from '@grafana/faro-core/src/testUtils';

import { getCacheKey, readCachedConfig, writeCachedConfig } from './cache';
import { REMOTE_CONFIG_SCHEMA_VERSION } from './types';

describe('remoteConfig cache', () => {
  const appKey = 'abc123';

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('keys the cache by app key and schema version', () => {
    expect(getCacheKey(appKey)).toBe(`faro_remote_config_v${REMOTE_CONFIG_SCHEMA_VERSION}_${appKey}`);
  });

  it('round-trips a written config', () => {
    writeCachedConfig(appKey, { config: { version: '1', sampleRate: 0.5 } }, mockInternalLogger);

    const read = readCachedConfig(appKey, mockInternalLogger);
    expect(read).toEqual({ config: { version: '1', sampleRate: 0.5 } });
  });

  it('returns null on a cold cache', () => {
    expect(readCachedConfig(appKey, mockInternalLogger)).toBeNull();
  });

  it('returns null on malformed JSON', () => {
    window.localStorage.setItem(getCacheKey(appKey), '{ not json');
    expect(readCachedConfig(appKey, mockInternalLogger)).toBeNull();
  });

  it('returns null when the cached schema version does not match', () => {
    window.localStorage.setItem(getCacheKey(appKey), JSON.stringify({ config: { version: '999', sampleRate: 0.5 } }));
    expect(readCachedConfig(appKey, mockInternalLogger)).toBeNull();
  });

  it('returns null when the cached payload fails validation', () => {
    window.localStorage.setItem(getCacheKey(appKey), JSON.stringify({ config: { version: '1', sampleRate: 5 } }));
    expect(readCachedConfig(appKey, mockInternalLogger)).toBeNull();
  });
});
