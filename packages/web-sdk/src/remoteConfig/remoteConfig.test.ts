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
