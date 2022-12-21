import { initializeFaro } from '../initialize';
import { mockConfig } from '../testUtils';

describe('metas', () => {
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
});
