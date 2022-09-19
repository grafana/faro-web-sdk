import { mockConfig, mockInternalLogger } from '../testUtils';
import { initializeMetas } from './initialize';

describe('metas', () => {
  it('can set listeners and they will be notified on meta changes', () => {
    const config = mockConfig();
    const metas = initializeMetas(mockInternalLogger, config);
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

export {};
