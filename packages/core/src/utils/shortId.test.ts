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

  it('uses crypto.getRandomValues when available and does not warn', () => {
    const spy = jest.spyOn(globalThis.crypto, 'getRandomValues');
    const warnSpy = jest.spyOn(console, 'warn');

    genShortID(12);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]![0]).toBeInstanceOf(Uint32Array);
    expect((spy.mock.calls[0]![0] as Uint32Array).length).toBe(12);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('generates distinct ids across many calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(genShortID());
    }
    expect(ids.size).toBe(1000);
  });
});

describe('genShortID Math.random fallback', () => {
  let originalCrypto: Crypto;

  beforeEach(() => {
    originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {},
    });
    jest.resetModules();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: originalCrypto,
    });
    jest.restoreAllMocks();
  });

  it('falls back to Math.random when crypto is unavailable', async () => {
    const { genShortID: freshGenShortID } = await import('./shortId');
    const randomSpy = jest.spyOn(Math, 'random');
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const id = freshGenShortID(15);

    expect(randomSpy).toHaveBeenCalledTimes(15);
    expect(id).toHaveLength(15);
    expect(id).toMatch(alphabetRegex);
  });

  it('emits a console warning on first fallback to Math.random', async () => {
    const { genShortID: freshGenShortID } = await import('./shortId');
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    freshGenShortID(10);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('crypto.getRandomValues() is not available')
    );

    freshGenShortID(10);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
