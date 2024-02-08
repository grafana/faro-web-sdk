import { initializeFaro } from '../../initialize';
import { mockConfig } from '../../testUtils';

describe('metaApi', () => {
  beforeAll(() => {
    delete (global as any).FARO_BUNDLE_ID_FOO;
  });

  afterAll(() => {
    delete (global as any).FARO_BUNDLE_ID_FOO;
  });

  it('can get the build ID from the global object', () => {
    const { api } = initializeFaro(mockConfig());

    expect(api.getBuildId('foo')).toBeUndefined();

    (global as any).FARO_BUNDLE_ID_FOO = 'bar';
    expect(api.getBuildId('foo')).toEqual('bar');
  });
});
