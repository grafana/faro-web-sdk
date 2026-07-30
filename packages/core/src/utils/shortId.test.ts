import { genShortID } from './shortId';

const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
const alphabetRegex = new RegExp(`^[${alphabet}]*$`);

describe('genShortID', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a string of the default length', () => {
    expect(genShortID()).toHaveLength(10);
  });

  it('respects a custom length', () => {
    expect(genShortID(20)).toHaveLength(20);
    expect(genShortID(0)).toBe('');
  });

  it('only uses characters from the alphabet', () => {
    for (let i = 0; i < 100; i++) {
      expect(genShortID(32)).toMatch(alphabetRegex);
    }
  });

  it('uses crypto.getRandomValues when available', () => {
    const spy = jest.spyOn(globalThis.crypto, 'getRandomValues');

    genShortID(12);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]![0]).toBeInstanceOf(Uint32Array);
    expect((spy.mock.calls[0]![0] as Uint32Array).length).toBe(12);
  });

  it('falls back to Math.random when crypto is unavailable', () => {
    const originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {},
    });
    const randomSpy = jest.spyOn(Math, 'random');

    try {
      const id = genShortID(15);

      expect(randomSpy).toHaveBeenCalled();
      expect(id).toHaveLength(15);
      expect(id).toMatch(alphabetRegex);
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: originalCrypto,
      });
    }
  });

  it('generates distinct ids across many calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(genShortID());
    }
    expect(ids.size).toBe(1000);
  });
});
