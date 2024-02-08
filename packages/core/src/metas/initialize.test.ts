import { initializeFaro } from '../initialize';
import { mockConfig } from '../testUtils';

describe('metas', () => {
  beforeAll(() => {
    delete (global as any).FARO_BUNDLE_ID_TEST;
  });

  afterAll(() => {
    delete (global as any).FARO_BUNDLE_ID_TEST;
  });

  it('can set listeners and they will be notified on meta changes', () => {
    const { metas } = initializeFaro(mockConfig());

    const listener = jest.fn(() => {});
    metas.addListener(listener);

    metas.add({ user: { id: 'foo' } });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(metas.value);

    metas.add({ session: { id: '1' } });
    expect(listener).toHaveBeenCalledTimes(2);
    metas.removeListener(listener);

    metas.add({ session: { id: '2' } });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('can get the build ID from the global object', () => {
    (global as any).FARO_BUNDLE_ID_TEST = 'fizzbuzz';
    const {
      metas: {
        value: { app },
      },
    } = initializeFaro(mockConfig());

    expect(app?.bundleId).toEqual('fizzbuzz');
  });
});
