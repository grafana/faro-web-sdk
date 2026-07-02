import { initializeFaro } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

import { getSessionStorageKey } from './getSessionStorageKey';
import { STORAGE_KEY } from './sessionConstants';

describe('getSessionStorageKey', () => {
  it('returns the bare storage key when no namespace is configured.', () => {
    initializeFaro(mockConfig({ sessionTracking: {} }));

    expect(getSessionStorageKey()).toBe(STORAGE_KEY);
  });

  it('suffixes the storage key with the configured namespace.', () => {
    initializeFaro(mockConfig({ sessionTracking: { storageKeyNamespace: 'my-app-key' } }));

    expect(getSessionStorageKey()).toBe(`${STORAGE_KEY}_my-app-key`);
  });
});
