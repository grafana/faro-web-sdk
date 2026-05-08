import { getBundleId, getGitHash } from './sourceMaps';

describe('sourceMapUpload utils', () => {
  beforeAll(() => {
    delete (global as any).__faroBundleId_foo;
    delete (global as any).__faroGitHash_foo;
  });

  afterAll(() => {
    delete (global as any).__faroBundleId_foo;
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
});
