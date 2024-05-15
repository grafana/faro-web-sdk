import { getBundleId } from './sourceMaps';

describe('sourceMapUpload utils', () => {
  beforeAll(() => {
    delete (global as any).__faroBundleId_foo;
  });

  afterAll(() => {
    delete (global as any).__faroBundleId_foo;
  });

  it('can get the bundle ID from the global object', () => {
    expect(getBundleId('foo')).toBeUndefined();

    (global as any).__faroBundleId_foo = 'bar';
    expect(getBundleId('foo')).toEqual('bar');
  });
});
