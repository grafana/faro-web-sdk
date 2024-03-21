import { getBundleId, getErrorToBundleIdMap } from './sourceMaps';

describe('sourceMapUpload utils', () => {
  beforeEach(() => {
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
    expect(getErrorToBundleIdMap()).toBeUndefined();

    const e = new Error();
    (global as any).__faroBundleIds = new Map([[e, 'bar']]);
    expect(getErrorToBundleIdMap()).toEqual(new Map([[e, 'bar']]));
  });
});
