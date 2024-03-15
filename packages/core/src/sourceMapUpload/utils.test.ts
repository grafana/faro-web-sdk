import { getBundleId, getBundleIdFromError, getBundleIdStackMap } from './utils';

describe('sourceMapUpload utils', () => {
  beforeAll(() => {
    delete (global as any).__faroBundleId_foo;
    delete (global as any).__faroBundleIds;
  });

  afterAll(() => {
    delete (global as any).__faroBundleId_foo;
    delete (global as any).__faroBundleIds;
  });

  it('can get the bundle ID from the global object', () => {
    expect(getBundleId('foo')).toBeUndefined();

    (global as any).__faroBundleId_foo = 'bar';
    expect(getBundleId('foo')).toEqual('bar');
  });

  it('can get the bundle ID stack map from the global object', () => {
    expect(getBundleIdStackMap()).toBeUndefined();

    const e = new Error();
    (global as any).__faroBundleIds = new Map([[e.stack, 'bar']]);
    expect(getBundleIdStackMap()).toEqual(new Map([[e.stack, 'bar']]));
  });

  it('can get the bundle ID from an error', () => {
    const e = new Error();
    expect(getBundleIdStackMap()).toBeUndefined();

    (global as any).__faroBundleIds = new Map([[e.stack, 'bar']]);
    expect(getBundleIdFromError(e)).toEqual('bar');
  });
});
