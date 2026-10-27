import { initializeFaro } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { createSession } from '../../../metas';
import { SessionInstrumentation } from '../instrumentation';

import { isSampled } from './sampling';
import { STORAGE_KEY } from './sessionConstants';

describe('Sampling.', () => {
  const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')!;

  afterEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(globalThis, 'crypto', cryptoDescriptor);
  });

  describe.each(['samplingRate', 'sampler'] as const)('%s', (source) => {
    it.each([
      [0, false],
      [1, true],
      [-1, false],
      [2, true],
      [-Infinity, false],
      [Infinity, true],
      [NaN, false],
      ['hello', false],
      ['0.5', false],
      [true, false],
      [{}, false],
    ])('Handles rate %p as %s without drawing randomness.', (rate, expected) => {
      initializeFaro(
        mockConfig({
          sessionTracking:
            source === 'sampler'
              ? { samplingRate: 1, sampler: () => rate as number }
              : { samplingRate: rate as number },
        })
      );
      const cryptoSpy = jest.spyOn(globalThis.crypto, 'getRandomValues');
      const randomSpy = jest.spyOn(Math, 'random');

      expect(isSampled()).toBe(expected);
      expect(cryptoSpy).not.toHaveBeenCalled();
      expect(randomSpy).not.toHaveBeenCalled();
    });

    it.each<[number, number, boolean]>([
      [0, 0.5, true],
      [2 ** 31 - 1, 0.5, true],
      [2 ** 31, 0.5, false],
      [2 ** 31 + 1, 0.5, false],
      [2 ** 32 - 1, 0.5, false],
      [2 ** 32 - 1, 1 - Number.EPSILON, true],
    ])('Samples integer %s at rate %s as %s.', (value, rate, expected) => {
      initializeFaro(
        mockConfig({
          sessionTracking: source === 'sampler' ? { samplingRate: 1, sampler: () => rate } : { samplingRate: rate },
        })
      );
      const cryptoSpy = jest.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
        (array as Uint32Array)[0] = value;
        return array;
      });
      const randomSpy = jest.spyOn(Math, 'random');

      expect(isSampled()).toBe(expected);
      expect(cryptoSpy).toHaveBeenCalledTimes(1);
      expect(cryptoSpy).toHaveBeenCalledWith(new Uint32Array([value]));
      expect(randomSpy).not.toHaveBeenCalled();
    });
  });

  it.each([undefined, null])('Uses the default rate when samplingRate is %s.', (rate) => {
    initializeFaro(mockConfig({ sessionTracking: { samplingRate: rate as any } }));
    const cryptoSpy = jest.spyOn(globalThis.crypto, 'getRandomValues');
    const randomSpy = jest.spyOn(Math, 'random');

    expect(isSampled()).toBe(true);
    expect(cryptoSpy).not.toHaveBeenCalled();
    expect(randomSpy).not.toHaveBeenCalled();
  });

  it.each([undefined, null])('Uses the configured rate when the sampler returns %s.', (rate) => {
    initializeFaro(mockConfig({ sessionTracking: { samplingRate: 0, sampler: () => rate as any } }));

    expect(isSampled()).toBe(false);
  });

  it('Returns proper sampling decision for rate returned by sampler function.', () => {
    let config = mockConfig({
      sessionTracking: {
        enabled: true,
        sampler: () => {
          return 1;
        },
      },
    });

    initializeFaro(config);
    expect(isSampled()).toBe(true);

    config.sessionTracking!.sampler = () => 0;
    initializeFaro(config);
    expect(isSampled()).toBe(false);

    config.sessionTracking!.session = createSession({ location: 'moon' });
    config.sessionTracking!.sampler = ({ metas }) => {
      if (metas.session?.attributes?.['location'] === 'moon') {
        return 0;
      }
      return 1;
    };
    initializeFaro(config);
    expect(isSampled()).toBe(false);

    config.sessionTracking!.session = createSession({ location: 'mars' });
    initializeFaro(config);
    expect(isSampled()).toBe(true);
  });

  describe.each(['missing crypto', 'missing getRandomValues', 'throwing getRandomValues'])('%s', (environment) => {
    beforeEach(() => {
      initializeFaro(mockConfig({ sessionTracking: { samplingRate: 0.5 } }));

      if (environment === 'missing crypto') {
        Reflect.deleteProperty(globalThis, 'crypto');
      } else if (environment === 'missing getRandomValues') {
        Object.defineProperty(globalThis, 'crypto', { configurable: true, value: {} });
      } else {
        jest.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(() => {
          throw new Error('Web Crypto unavailable');
        });
      }
    });

    it.each<[number, boolean]>([
      [0, true],
      [0.49, true],
      [0.5, false],
      [0.99, false],
    ])('Preserves fractional sampling for fallback draw %s.', (value, expected) => {
      const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(value);

      expect(isSampled()).toBe(expected);
      expect(randomSpy).toHaveBeenCalledTimes(1);
    });

    it.each<[number, boolean]>([
      [0, false],
      [1, true],
    ])('Returns directly for rate %s without Web Crypto.', (samplingRate, expected) => {
      initializeFaro(mockConfig({ sessionTracking: { samplingRate } }));
      const randomSpy = jest.spyOn(Math, 'random');

      expect(isSampled()).toBe(expected);
      expect(randomSpy).not.toHaveBeenCalled();
    });

    it.each<[number, boolean]>([
      [0.25, true],
      [0.75, false],
    ])('Initializes session tracking with fallback draw %s.', (value, expected) => {
      window.sessionStorage.removeItem(STORAGE_KEY);
      jest.spyOn(Math, 'random').mockReturnValue(value);
      const transport = new MockTransport();
      const instrumentation = new SessionInstrumentation();
      const faro = initializeFaro(
        mockConfig({
          transports: [transport],
          instrumentations: [instrumentation],
          sessionTracking: {
            enabled: true,
            persistent: false,
            samplingRate: 0.5,
            session: { id: 'sampling-test' },
          },
        })
      );

      try {
        expect(faro.api.getSession()?.attributes?.['isSampled']).toBe(String(expected));
        faro.api.pushEvent('after-initialization');
        expect(
          transport.items.some((item) => 'name' in item.payload && item.payload.name === 'after-initialization')
        ).toBe(expected);
      } finally {
        faro.instrumentations.remove(instrumentation);
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    });
  });
});
