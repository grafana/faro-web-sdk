import { getSessionStorageKey } from './getSessionStorageKey';
import { STORAGE_KEY } from './sessionConstants';

describe('getSessionStorageKey', () => {
  it('returns the bare storage key when no namespace is provided.', () => {
    expect(getSessionStorageKey(undefined)).toBe(STORAGE_KEY);
  });

  it('suffixes the storage key with the provided namespace.', () => {
    expect(getSessionStorageKey('my-app-key')).toBe(`${STORAGE_KEY}_my-app-key`);
  });
});
