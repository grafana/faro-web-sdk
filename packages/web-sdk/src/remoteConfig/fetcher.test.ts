import { mockInternalLogger } from '@grafana/faro-core/src/testUtils';

import { buildConfigUrl, extractAppKey, fetchRemoteConfig, isValidRemoteConfig } from './fetcher';

describe('remoteConfig fetcher', () => {
  describe('extractAppKey', () => {
    it('extracts the app key from a collector URL', () => {
      expect(extractAppKey('https://collector.example.com/collect/abc123')).toBe('abc123');
      expect(extractAppKey('https://collector.example.com/collect/abc123?foo=bar')).toBe('abc123');
    });

    it('returns null when no key segment is present', () => {
      expect(extractAppKey('https://collector.example.com/collect')).toBeNull();
      expect(extractAppKey(undefined)).toBeNull();
    });
  });

  describe('buildConfigUrl', () => {
    it('uses an explicit base url when provided', () => {
      expect(buildConfigUrl('abc123', undefined, 'https://cfg.example.com')).toBe(
        'https://cfg.example.com/config/abc123'
      );
      expect(buildConfigUrl('abc123', undefined, 'https://cfg.example.com/')).toBe(
        'https://cfg.example.com/config/abc123'
      );
    });

    it('derives the config url from the collector url', () => {
      expect(buildConfigUrl('abc123', 'https://collector.example.com/collect/abc123')).toBe(
        'https://collector.example.com/config/abc123'
      );
    });

    it('returns null when it cannot derive a url', () => {
      expect(buildConfigUrl('abc123', undefined)).toBeNull();
      expect(buildConfigUrl('abc123', 'https://example.com/no-collect-here')).toBeNull();
    });
  });

  describe('isValidRemoteConfig', () => {
    it('accepts a valid config with and without sampleRate', () => {
      expect(isValidRemoteConfig({ version: '1', sampleRate: 0.5 })).toBe(true);
      expect(isValidRemoteConfig({ version: '1' })).toBe(true);
      expect(isValidRemoteConfig({ version: '1', sampleRate: 0 })).toBe(true);
      expect(isValidRemoteConfig({ version: '1', sampleRate: 1 })).toBe(true);
    });

    it('rejects malformed configs', () => {
      expect(isValidRemoteConfig(null)).toBe(false);
      expect(isValidRemoteConfig('nope')).toBe(false);
      expect(isValidRemoteConfig({})).toBe(false);
      expect(isValidRemoteConfig({ version: 1 })).toBe(false);
      expect(isValidRemoteConfig({ version: '1', sampleRate: 1.5 })).toBe(false);
      expect(isValidRemoteConfig({ version: '1', sampleRate: -0.1 })).toBe(false);
      expect(isValidRemoteConfig({ version: '1', sampleRate: 'x' })).toBe(false);
    });
  });

  describe('fetchRemoteConfig', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
      jest.clearAllMocks();
    });

    it('returns updated with the parsed config and ETag on 200', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({ version: '1', sampleRate: 0.25 }),
        headers: { get: (name: string) => (name === 'ETag' ? 'etag-1' : null) },
      }) as any;

      const result = await fetchRemoteConfig('https://x/config/k', 1500, mockInternalLogger);

      expect(result).toEqual({
        kind: 'updated',
        value: { config: { version: '1', sampleRate: 0.25 }, etag: 'etag-1' },
      });
    });

    it('sends If-None-Match and returns not-modified on 304', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        status: 304,
        ok: false,
        headers: { get: () => null },
      });
      global.fetch = fetchMock as any;

      const result = await fetchRemoteConfig('https://x/config/k', 1500, mockInternalLogger, 'etag-1');

      expect(result).toEqual({ kind: 'not-modified' });
      expect(fetchMock).toHaveBeenCalledWith(
        'https://x/config/k',
        expect.objectContaining({ headers: { 'If-None-Match': 'etag-1' } })
      );
    });

    it('returns error on a non-ok status', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 500,
        ok: false,
        headers: { get: () => null },
      }) as any;

      const result = await fetchRemoteConfig('https://x/config/k', 1500, mockInternalLogger);
      expect(result).toEqual({ kind: 'error' });
    });

    it('returns error on a malformed body', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({ not: 'valid' }),
        headers: { get: () => null },
      }) as any;

      const result = await fetchRemoteConfig('https://x/config/k', 1500, mockInternalLogger);
      expect(result).toEqual({ kind: 'error' });
    });

    it('returns error (never throws) when fetch rejects', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as any;

      const result = await fetchRemoteConfig('https://x/config/k', 1500, mockInternalLogger);
      expect(result).toEqual({ kind: 'error' });
    });
  });
});
