import { initializeFaro } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

import { isSampled } from './sampling';

describe('Sampling', () => {
  afterEach(() => {
    jest.spyOn(global.Math, 'random').mockRestore();
  });

  it('returns false if sampleRate is not of type number', () => {
    const config = mockConfig({
      sessionTracking: {
        samplingRate: 'hello' as any,
      },
    });

    initializeFaro(config);

    expect(isSampled()).toBe(false);
  });

  it('returns true when samplingRate is 1', () => {
    const config = mockConfig({
      sessionTracking: {
        enabled: true,
        samplingRate: 1,
      },
    });

    initializeFaro(config);
    expect(isSampled()).toBe(true);
  });

  it('returns false when samplingRate is 0', () => {
    const config = mockConfig({
      sessionTracking: {
        enabled: true,
        samplingRate: 0,
      },
    });

    initializeFaro(config);
    expect(isSampled()).toBe(false);
  });

  it('returns proper sampling decision based on Math.random', () => {
    const config = mockConfig({
      sessionTracking: {
        enabled: true,
        samplingRate: 0.5,
      },
    });

    initializeFaro(config);

    // Mock Math.random to return 0.4 (less than 0.5)
    jest.spyOn(global.Math, 'random').mockReturnValue(0.4);
    expect(isSampled()).toBe(true);

    // Mock Math.random to return 0.6 (greater than 0.5)
    jest.spyOn(global.Math, 'random').mockReturnValue(0.6);
    expect(isSampled()).toBe(false);
  });

  it('returns proper sampling decision for rate returned by sampler function', () => {
    const config = mockConfig({
      sessionTracking: {
        enabled: true,
        sampler: () => {
          return 1;
        },
      },
    });

    initializeFaro(config);
    expect(isSampled()).toBe(true);
  });

  it('returns false when sampler function returns 0', () => {
    const config = mockConfig({
      sessionTracking: {
        enabled: true,
        sampler: () => 0,
      },
    });

    initializeFaro(config);
    expect(isSampled()).toBe(false);
  });

  it('sampler function receives metas', () => {
    const samplerFn = jest.fn(() => 1);
    const config = mockConfig({
      sessionTracking: {
        enabled: true,
        sampler: samplerFn,
      },
    });

    initializeFaro(config);
    isSampled();

    expect(samplerFn).toHaveBeenCalledWith({
      metas: expect.any(Object),
    });
  });

  it('sampler function can use metas to make decision', () => {
    const config = mockConfig({
      sessionTracking: {
        enabled: true,
        sampler: ({ metas }) => {
          // Sample based on whether we have a session ID
          return metas.session?.id ? 1 : 0;
        },
      },
    });

    const faro = initializeFaro(config);

    // With session meta, should sample
    faro.metas.add({ session: { id: 'test-session-123' } });
    expect(isSampled()).toBe(true);
  });

  it('defaults to samplingRate of 1 when no configuration provided', () => {
    const config = mockConfig({
      sessionTracking: {
        enabled: true,
      },
    });

    initializeFaro(config);
    expect(isSampled()).toBe(true);
  });

  it('sampler function takes precedence over samplingRate', () => {
    const config = mockConfig({
      sessionTracking: {
        enabled: true,
        samplingRate: 0, // Should be ignored
        sampler: () => 1, // Should be used
      },
    });

    initializeFaro(config);
    expect(isSampled()).toBe(true);
  });

  it('returns proper sampling decision when sampler returns non-number', () => {
    const config = mockConfig({
      sessionTracking: {
        enabled: true,
        sampler: () => 'invalid' as any,
      },
    });

    initializeFaro(config);
    expect(isSampled()).toBe(false);
  });
});
