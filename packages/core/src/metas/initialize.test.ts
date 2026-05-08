import { initializeFaro } from '../initialize';
import { mockConfig } from '../testUtils';

describe('metas', () => {
  it('sets app.gitHash from global object on initialization', () => {
    (global as any).__faroGitHash_test = 'abc123def456abc123def456abc123def456abc1';

    const { metas } = initializeFaro(mockConfig());
    expect(metas.value.app?.gitHash).toEqual('abc123def456abc123def456abc123def456abc1');

    delete (global as any).__faroGitHash_test;
  });

  it('leaves app.gitHash undefined when global is not set', () => {
    delete (global as any).__faroGitHash_test;

    const { metas } = initializeFaro(mockConfig());
    expect(metas.value.app?.gitHash).toBeUndefined();
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
});
