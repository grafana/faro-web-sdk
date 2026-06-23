import type { Config } from '@grafana/faro-core';
import { mockInternalLogger } from '@grafana/faro-core/src/testUtils';

import { getCacheKey } from './cache';
import * as fetcher from './fetcher';
import { engageRemoteConfig, prepareRemoteConfig } from './remoteConfig';
import type { RemoteConfigFaro } from './remoteConfig';

const collectorUrl = 'https://collector.example.com/collect/abc123';
const appKey = 'abc123';

function mockSessionConfig(overrides: Partial<NonNullable<Config['sessionTracking']>> = {}): Config {
  return {
    sessionTracking: { enabled: true, samplingRate: 1, ...overrides },
  } as unknown as Config;
}

/**
 * A mock faro whose transports implement the real hold-buffer semantics so the lifecycle can be
 * exercised end-to-end without spinning up a full Faro instance.
 */
function makeMockFaro(config: Config): RemoteConfigFaro & { sent: string[]; dropped: number } {
  let holding = false;
  let buffer: string[] = [];
  let bytes = 0;
  let maxBytes = Infinity;
  let notified = false;
  let onFull: (() => void) | undefined;

  const sent: string[] = [];
  let dropped = 0;

  const faro: RemoteConfigFaro & { sent: string[]; dropped: number; push: (item: string) => void } = {
    config,
    internalLogger: mockInternalLogger,
    sent,
    dropped,
    transports: {
      hold: (options) => {
        holding = true;
        buffer = [];
        bytes = 0;
        notified = false;
        maxBytes = options?.maxBufferBytes ?? Infinity;
        onFull = options?.onBufferFull;
      },
      flushHeld: () => {
        if (!holding) {
          return;
        }
        holding = false;
        sent.push(...buffer);
        buffer = [];
      },
      dropHeld: () => {
        if (!holding) {
          return;
        }
        holding = false;
        dropped += buffer.length;
        faro.dropped = dropped;
        buffer = [];
      },
      isHolding: () => holding,
    },
    push: (item: string) => {
      if (holding) {
        buffer.push(item);
        bytes += item.length;
        if (!notified && bytes > maxBytes) {
          notified = true;
          onFull?.();
        }
        return;
      }
      sent.push(item);
    },
  };

  return faro;
}

describe('remoteConfig orchestrator', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();
    fetchSpy = jest.spyOn(fetcher, 'fetchRemoteConfig');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('prepareRemoteConfig', () => {
    it('disables when a local custom sampler is present', () => {
      const config = mockSessionConfig({ sampler: () => 1 });
      const prep = prepareRemoteConfig({ config, collectorUrl, options: {}, internalLogger: mockInternalLogger });
      expect(prep.mode).toBe('disabled');
    });

    it('disables when the app key cannot be resolved', () => {
      const config = mockSessionConfig();
      const prep = prepareRemoteConfig({
        config,
        collectorUrl: 'https://example.com/no-key',
        options: {},
        internalLogger: mockInternalLogger,
      });
      expect(prep.mode).toBe('disabled');
    });

    it('proceeds with a configEndpoint, keying the cache by the app ID when there is no app key', () => {
      const configEndpoint = 'https://oss.example.com/my/explicit/config';
      const config = mockSessionConfig();
      // No resolvable app key, but an app ID (config.app.name) is available for cache scoping.
      (config as any).app = { name: 'my-app' };

      const prep = prepareRemoteConfig({
        config,
        collectorUrl: 'https://example.com/no-key',
        options: { configEndpoint },
        internalLogger: mockInternalLogger,
      });

      // No app key resolvable, but the explicit endpoint keeps remote config enabled.
      expect(prep.mode).toBe('cold');
      expect(prep.appKey).toBeUndefined();
      // configUrl is the endpoint used verbatim — not transformed into a /config/{appKey} URL.
      expect(prep.configUrl).toBe(configEndpoint);
      // The cache is keyed by the app ID — NEVER the configEndpoint URL.
      expect(prep.cacheId).toBe('my-app');
    });

    it('proceeds with a configEndpoint but skips caching when neither an app key nor an app ID exists', () => {
      const configEndpoint = 'https://oss.example.com/my/explicit/config';
      const config = mockSessionConfig();
      // No app key (collector has no key) and no app ID (config.app is absent).

      const prep = prepareRemoteConfig({
        config,
        collectorUrl: 'https://example.com/no-key',
        options: { configEndpoint },
        internalLogger: mockInternalLogger,
      });

      // The fetch still proceeds (cold lifecycle), but with no identity to key the cache by.
      expect(prep.mode).toBe('cold');
      expect(prep.appKey).toBeUndefined();
      expect(prep.configUrl).toBe(configEndpoint);
      // No app key + no app ID => no cacheId. The endpoint URL is never used as a key.
      expect(prep.cacheId).toBeUndefined();
    });

    it('uses the configEndpoint verbatim (precedence over url and collector-derived URL)', () => {
      const configEndpoint = 'https://oss.example.com/my/explicit/config';
      const config = mockSessionConfig();

      const prep = prepareRemoteConfig({
        config,
        collectorUrl,
        options: { configEndpoint, url: 'https://ignored.example.com' },
        internalLogger: mockInternalLogger,
      });

      // Endpoint wins over both `url` and the collector-derived `/config/{appKey}` URL.
      expect(prep.configUrl).toBe(configEndpoint);
      // The app key is still extracted (kept on the result), and wins for cache scoping.
      expect(prep.appKey).toBe(appKey);
      expect(prep.cacheId).toBe(appKey);
    });

    it('warm cache is keyed by the app ID when there is no app key', () => {
      const configEndpoint = 'https://oss.example.com/my/explicit/config';
      // The cached entry is keyed by the app ID (config.app.name), NOT the configEndpoint URL.
      window.localStorage.setItem(
        getCacheKey('my-app'),
        JSON.stringify({ config: { version: '1', sampleRate: 0.2 }, etag: 'e9' })
      );
      const config = mockSessionConfig({ samplingRate: 0.5 });
      (config as any).app = { name: 'my-app' };

      const prep = prepareRemoteConfig({
        config,
        collectorUrl: 'https://example.com/no-key',
        options: { configEndpoint },
        internalLogger: mockInternalLogger,
      });

      expect(prep.mode).toBe('warm');
      expect(prep.cacheId).toBe('my-app');
      // The cached rate read via the app-ID-keyed entry is applied to the live config.
      expect(config.sessionTracking!.samplingRate).toBe(0.2);
    });

    it('warm cache applies the cached rate to the config before init', () => {
      window.localStorage.setItem(
        getCacheKey(appKey),
        JSON.stringify({ config: { version: '1', sampleRate: 0.1 }, etag: 'e1' })
      );
      const config = mockSessionConfig({ samplingRate: 0.5 });

      const prep = prepareRemoteConfig({ config, collectorUrl, options: {}, internalLogger: mockInternalLogger });

      expect(prep.mode).toBe('warm');
      expect(config.sessionTracking!.samplingRate).toBe(0.1);
    });

    it('cold cache stashes the local rate and forces keep-all (1) before init', () => {
      const config = mockSessionConfig({ samplingRate: 0.5 });
      const prep = prepareRemoteConfig({ config, collectorUrl, options: {}, internalLogger: mockInternalLogger });

      expect(prep.mode).toBe('cold');
      // The local rate is stashed so finalize can fall back to it on fetch failure...
      expect(prep.originalSamplingRate).toBe(0.5);
      // ...and the live config is forced to keep-all so the session is created isSampled='true' and
      // its before-send hook never pre-drops before the remote decision lands.
      expect(config.sessionTracking!.samplingRate).toBe(1);
    });

    it('cold cache stashes undefined when no local rate is set', () => {
      const config = mockSessionConfig({ samplingRate: undefined });
      const prep = prepareRemoteConfig({ config, collectorUrl, options: {}, internalLogger: mockInternalLogger });

      expect(prep.mode).toBe('cold');
      expect(prep.originalSamplingRate).toBeUndefined();
      expect(config.sessionTracking!.samplingRate).toBe(1);
    });
  });

  describe('engageRemoteConfig - warm cache', () => {
    it('triggers a background revalidation and does not hold', () => {
      fetchSpy.mockResolvedValue({ kind: 'not-modified' });
      const faro = makeMockFaro(mockSessionConfig());

      engageRemoteConfig(faro, {
        mode: 'warm',
        appKey,
        cacheId: appKey,
        configUrl: 'https://collector.example.com/config/abc123',
        timeoutMs: 1500,
        maxBufferBytes: 64 * 1024,
        cachedEtag: 'e1',
      });

      expect(faro.transports.isHolding()).toBe(false);
      expect(fetchSpy).toHaveBeenCalledWith(expect.any(String), 1500, mockInternalLogger, 'e1');
    });
  });

  describe('engageRemoteConfig - cold cache (defer-and-buffer)', () => {
    const coldPrep = {
      mode: 'cold' as const,
      appKey,
      cacheId: appKey,
      configUrl: 'https://collector.example.com/config/abc123',
      timeoutMs: 1500,
      maxBufferBytes: 64 * 1024,
    };

    it('buffers early telemetry then flushes when finalized as sampled', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0); // 0 < 1 => sampled
      let resolveFetch: (v: fetcher.FetchResult) => void;
      fetchSpy.mockReturnValue(new Promise<fetcher.FetchResult>((resolve) => (resolveFetch = resolve)));

      const faro = makeMockFaro(mockSessionConfig());
      engageRemoteConfig(faro, coldPrep);

      // early error arrives while pending
      (faro as any).push('early-error');
      expect(faro.transports.isHolding()).toBe(true);
      expect(faro.sent).toHaveLength(0);

      resolveFetch!({ kind: 'updated', value: { config: { version: '1', sampleRate: 1 } } });
      await Promise.resolve();
      await Promise.resolve();

      expect(faro.transports.isHolding()).toBe(false);
      expect(faro.sent).toContain('early-error');

      // streams normally after finalize
      (faro as any).push('later');
      expect(faro.sent).toContain('later');
    });

    it('buffers early telemetry then drops when finalized as not sampled', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.9); // 0.9 < 0 is false => not sampled
      let resolveFetch: (v: fetcher.FetchResult) => void;
      fetchSpy.mockReturnValue(new Promise<fetcher.FetchResult>((resolve) => (resolveFetch = resolve)));

      const faro = makeMockFaro(mockSessionConfig());
      engageRemoteConfig(faro, coldPrep);

      (faro as any).push('early-error');

      resolveFetch!({ kind: 'updated', value: { config: { version: '1', sampleRate: 0 } } });
      await Promise.resolve();
      await Promise.resolve();

      expect(faro.transports.isHolding()).toBe(false);
      expect(faro.sent).not.toContain('early-error');
      expect(faro.dropped).toBe(1);
    });

    it('falls back to the stashed local rate on fetch error — local keeps the session', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      fetchSpy.mockResolvedValue({ kind: 'error' });

      // Live config was forced to keep-all in prepare; the *stashed* local rate (1) is the fallback.
      const faro = makeMockFaro(mockSessionConfig({ samplingRate: 1 }));
      engageRemoteConfig(faro, { ...coldPrep, originalSamplingRate: 1 });

      (faro as any).push('early');
      await Promise.resolve();
      await Promise.resolve();

      // fallback rate 1 => 0.5 < 1 => sampled => flushed
      expect(faro.transports.isHolding()).toBe(false);
      expect(faro.sent).toContain('early');
    });

    it('falls back to the stashed local rate on fetch error — local drops the session', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.7); // 0.7 < 0.5 is false => not sampled
      fetchSpy.mockResolvedValue({ kind: 'error' });

      const faro = makeMockFaro(mockSessionConfig({ samplingRate: 1 }));
      // Stashed local rate is 0.5 even though the live config was forced to keep-all (1).
      engageRemoteConfig(faro, { ...coldPrep, originalSamplingRate: 0.5 });

      (faro as any).push('early');
      await Promise.resolve();
      await Promise.resolve();

      // fallback honors the *local* 0.5 (not the keep-all 1) => 0.7 !< 0.5 => dropped
      expect(faro.transports.isHolding()).toBe(false);
      expect(faro.sent).not.toContain('early');
      expect(faro.dropped).toBe(1);
    });

    it('remote rate is the single source of truth: local 0.5 + remote 0.1 gates solely by 0.1', async () => {
      // random in [0.1, 0.5): local 0.5 would KEEP, remote 0.1 must DROP. Proves remote-only gating.
      jest.spyOn(Math, 'random').mockReturnValue(0.3);
      fetchSpy.mockResolvedValue({ kind: 'updated', value: { config: { version: '1', sampleRate: 0.1 } } });

      const faro = makeMockFaro(mockSessionConfig({ samplingRate: 1 }));
      engageRemoteConfig(faro, { ...coldPrep, originalSamplingRate: 0.5 });

      (faro as any).push('early');
      await Promise.resolve();
      await Promise.resolve();

      expect(faro.transports.isHolding()).toBe(false);
      expect(faro.sent).not.toContain('early');
      expect(faro.dropped).toBe(1);
    });

    it('remote 1.0 keeps a session that local 0.5 would have dropped', async () => {
      // random 0.7: local 0.5 would DROP, remote 1.0 must KEEP.
      jest.spyOn(Math, 'random').mockReturnValue(0.7);
      fetchSpy.mockResolvedValue({ kind: 'updated', value: { config: { version: '1', sampleRate: 1 } } });

      const faro = makeMockFaro(mockSessionConfig({ samplingRate: 1 }));
      engageRemoteConfig(faro, { ...coldPrep, originalSamplingRate: 0.5 });

      (faro as any).push('early');
      await Promise.resolve();
      await Promise.resolve();

      expect(faro.transports.isHolding()).toBe(false);
      expect(faro.sent).toContain('early');
    });

    it('remote 0 drops the session regardless of a permissive local rate', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0); // 0 < 0 is false => not sampled
      fetchSpy.mockResolvedValue({ kind: 'updated', value: { config: { version: '1', sampleRate: 0 } } });

      const faro = makeMockFaro(mockSessionConfig({ samplingRate: 1 }));
      engageRemoteConfig(faro, { ...coldPrep, originalSamplingRate: 1 });

      (faro as any).push('early');
      await Promise.resolve();
      await Promise.resolve();

      expect(faro.transports.isHolding()).toBe(false);
      expect(faro.sent).not.toContain('early');
      expect(faro.dropped).toBe(1);
    });

    it('finalizes against the local rate on an unexpected 304 (no etag sent on cold path)', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.7); // 0.7 !< 0.5 => not sampled
      fetchSpy.mockResolvedValue({ kind: 'not-modified' });

      const faro = makeMockFaro(mockSessionConfig({ samplingRate: 1 }));
      engageRemoteConfig(faro, { ...coldPrep, originalSamplingRate: 0.5 });

      (faro as any).push('early');
      await Promise.resolve();
      await Promise.resolve();

      // Does not leave the app held; finalizes against the stashed local 0.5.
      expect(faro.transports.isHolding()).toBe(false);
      expect(faro.dropped).toBe(1);
    });

    it('finalizes early as sampled (keep) when the buffer cap is reached', async () => {
      // fetch stays pending so only the cap can finalize
      fetchSpy.mockReturnValue(new Promise(() => {}));

      const faro = makeMockFaro(mockSessionConfig());
      engageRemoteConfig(faro, { ...coldPrep, maxBufferBytes: 5 });

      (faro as any).push('aaaaaa'); // exceeds 5-byte cap

      expect(faro.transports.isHolding()).toBe(false);
      expect(faro.sent).toContain('aaaaaa');
    });

    it('applies the remote rate to the config (remote overrides local)', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);
      fetchSpy.mockResolvedValue({ kind: 'updated', value: { config: { version: '1', sampleRate: 0.2 } } });

      const config = mockSessionConfig({ samplingRate: 0.9 });
      const faro = makeMockFaro(config);
      engageRemoteConfig(faro, coldPrep);

      await Promise.resolve();
      await Promise.resolve();

      expect(config.sessionTracking!.samplingRate).toBe(0.2);
    });

    it('fetches the configEndpoint verbatim and keys the cache by the app ID when there is no app key', async () => {
      const configEndpoint = 'https://oss.example.com/my/explicit/config';
      jest.spyOn(Math, 'random').mockReturnValue(0); // 0 < 1 => sampled
      fetchSpy.mockResolvedValue({ kind: 'updated', value: { config: { version: '1', sampleRate: 1 } } });

      const faro = makeMockFaro(mockSessionConfig());
      // No appKey: the cache is keyed by the app ID (config.app.name), NOT the endpoint URL.
      engageRemoteConfig(faro, {
        mode: 'cold',
        cacheId: 'my-app',
        configUrl: configEndpoint,
        timeoutMs: 1500,
        maxBufferBytes: 64 * 1024,
      });

      await Promise.resolve();
      await Promise.resolve();

      // (a) the endpoint is fetched verbatim — not transformed.
      expect(fetchSpy).toHaveBeenCalledWith(configEndpoint, 1500, mockInternalLogger);
      // (b) the resolved config is cached under the app-ID-derived key — never the endpoint URL.
      expect(window.localStorage.getItem(getCacheKey('my-app'))).not.toBeNull();
      expect(window.localStorage.getItem(getCacheKey(configEndpoint))).toBeNull();
      expect(faro.transports.isHolding()).toBe(false);
    });

    it('fetches the configEndpoint verbatim but reads/writes nothing when there is no cacheId', async () => {
      const configEndpoint = 'https://oss.example.com/my/explicit/config';
      jest.spyOn(Math, 'random').mockReturnValue(0); // 0 < 1 => sampled
      fetchSpy.mockResolvedValue({ kind: 'updated', value: { config: { version: '1', sampleRate: 1 } } });

      const getItemSpy = jest.spyOn(Storage.prototype, 'getItem');
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

      const faro = makeMockFaro(mockSessionConfig());
      // No appKey AND no app ID => no cacheId. The full cold lifecycle still runs.
      engageRemoteConfig(faro, {
        mode: 'cold',
        cacheId: undefined,
        configUrl: configEndpoint,
        timeoutMs: 1500,
        maxBufferBytes: 64 * 1024,
      });

      await Promise.resolve();
      await Promise.resolve();

      // The endpoint is still fetched verbatim — the fetch lifecycle is unaffected.
      expect(fetchSpy).toHaveBeenCalledWith(configEndpoint, 1500, mockInternalLogger);
      // But localStorage is never touched (no read, no write) — no missing/colliding key.
      expect(setItemSpy).not.toHaveBeenCalled();
      expect(getItemSpy).not.toHaveBeenCalled();
      expect(faro.transports.isHolding()).toBe(false);
    });

    it('does not re-resolve after the decision is finalized once', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);
      fetchSpy.mockResolvedValue({ kind: 'updated', value: { config: { version: '1', sampleRate: 1 } } });

      const faro = makeMockFaro(mockSessionConfig());
      const dropSpy = jest.spyOn(faro.transports, 'dropHeld');
      const flushSpy = jest.spyOn(faro.transports, 'flushHeld');

      engageRemoteConfig(faro, { ...coldPrep, maxBufferBytes: 1 });

      // cap fires first (keep), then fetch resolves — finalize must be a no-op the second time
      (faro as any).push('x');
      await Promise.resolve();
      await Promise.resolve();

      expect(flushSpy).toHaveBeenCalledTimes(1);
      expect(dropSpy).not.toHaveBeenCalled();
    });
  });
});
