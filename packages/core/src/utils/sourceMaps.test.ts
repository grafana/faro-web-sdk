import { getBundleId, getGitHash } from './sourceMaps';

describe('sourceMapUpload utils', () => {
  const bundleKey = (appName: string) => `__faroBundleId_${appName}`;

  const deleteBundleId = (appName: string): void => {
    const key = bundleKey(appName);
    delete (globalThis as any)[key];
    delete (window as any)[key];
  };

  beforeAll(() => {
    deleteBundleId('foo');
    delete (global as any).__faroGitHash_foo;
  });

  afterAll(() => {
    deleteBundleId('foo');
    delete (global as any).__faroGitHash_foo;
  });

  it('can get the bundle ID from the global object', () => {
    expect(getBundleId('foo')).toBeUndefined();

    (global as any).__faroBundleId_foo = 'bar';
    expect(getBundleId('foo')).toEqual('bar');
  });

  it('returns undefined for git hash when not set', () => {
    expect(getGitHash('foo')).toBeUndefined();
  });

  it('can get the git hash from the global object', () => {
    (global as any).__faroGitHash_foo = 'abc123def456abc123def456abc123def456abc1';
    expect(getGitHash('foo')).toEqual('abc123def456abc123def456abc123def456abc1');
  });

  it('returns undefined when neither globalObject nor window defines a usable bundle id', () => {
    const app = 'missingBoth';
    deleteBundleId(app);
    expect(getBundleId(app)).toBeUndefined();
  });

  it('prefers globalObject over window when both define the bundle id', async () => {
    const app = 'bothDefined';
    const key = bundleKey(app);
    deleteBundleId(app);

    jest.resetModules();
    const detachedGlobalObject: Record<string, unknown> = { [key]: 'from-global' };
    jest.doMock('../globalObject', () => ({
      globalObject: detachedGlobalObject,
    }));

    const { getBundleId: getBundleIdFresh } = await import('./sourceMaps');

    try {
      (window as any)[key] = 'from-window';
      expect(getBundleIdFresh(app)).toBe('from-global');
    } finally {
      deleteBundleId(app);
      jest.dontMock('../globalObject');
      jest.resetModules();
    }
  });

  it('ignores an empty string on globalObject and reads from window', async () => {
    const app = 'emptyGlobalStr';
    const key = bundleKey(app);
    deleteBundleId(app);

    jest.resetModules();
    const detachedGlobalObject: Record<string, unknown> = { [key]: '' };
    jest.doMock('../globalObject', () => ({
      globalObject: detachedGlobalObject,
    }));

    const { getBundleId: getBundleIdFresh } = await import('./sourceMaps');

    try {
      (window as any)[key] = 'from-window';
      expect(getBundleIdFresh(app)).toBe('from-window');
    } finally {
      deleteBundleId(app);
      jest.dontMock('../globalObject');
      jest.resetModules();
    }
  });

  it('returns undefined when globalObject holds only an empty string', () => {
    const app = 'onlyEmptyGlobal';
    const key = bundleKey(app);
    try {
      deleteBundleId(app);
      (globalThis as any)[key] = '';
      expect(getBundleId(app)).toBeUndefined();
    } finally {
      deleteBundleId(app);
    }
  });

  it('returns undefined when globalObject misses and window has an empty string', async () => {
    const app = 'emptyWindowStr';
    const key = bundleKey(app);
    deleteBundleId(app);

    jest.resetModules();
    jest.doMock('../globalObject', () => ({ globalObject: {} }));
    const { getBundleId: getBundleIdFresh } = await import('./sourceMaps');

    try {
      (window as any)[key] = '';
      expect(getBundleIdFresh(app)).toBeUndefined();
    } finally {
      deleteBundleId(app);
      jest.dontMock('../globalObject');
      jest.resetModules();
    }
  });

  it('reads the bundle ID from window when globalObject does not carry it', async () => {
    const app = 'windowOnlyDetached';
    const key = bundleKey(app);
    delete (globalThis as any)[key];
    delete (window as any)[key];

    jest.resetModules();
    const detachedGlobalObject: Record<string, unknown> = {};
    jest.doMock('../globalObject', () => ({
      globalObject: detachedGlobalObject,
    }));

    const { getBundleId: getBundleIdWithDetachedGlobal } = await import('./sourceMaps');

    try {
      expect(getBundleIdWithDetachedGlobal(app)).toBeUndefined();
      expect(detachedGlobalObject[key]).toBeUndefined();
      expect((globalThis as any)[key]).toBeUndefined();

      (window as any)[key] = 'from-window';

      expect(getBundleIdWithDetachedGlobal(app)).toEqual('from-window');
    } finally {
      deleteBundleId(app);
      jest.dontMock('../globalObject');
      jest.resetModules();
    }
  });

  it('returns undefined when globalObject holds a non-string bundle id', () => {
    const app = 'nonStringGlobal';
    const key = bundleKey(app);
    try {
      deleteBundleId(app);
      (globalThis as any)[key] = 123 as any;
      expect(getBundleId(app)).toBeUndefined();
    } finally {
      deleteBundleId(app);
    }
  });

  it('returns undefined when window holds a non-string bundle id', async () => {
    const app = 'nonStringWindow';
    const key = bundleKey(app);
    deleteBundleId(app);

    jest.resetModules();
    jest.doMock('../globalObject', () => ({ globalObject: {} }));
    const { getBundleId: getBundleIdFresh } = await import('./sourceMaps');

    try {
      (window as any)[key] = true as any;
      expect(getBundleIdFresh(app)).toBeUndefined();
    } finally {
      deleteBundleId(app);
      jest.dontMock('../globalObject');
      jest.resetModules();
    }
  });
});
