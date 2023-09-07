import { faro } from '@grafana/faro-core';

type StorageMechanism = 'sessionStorage' | 'localStorage';

export function isWebStorageAvailable(type: StorageMechanism): boolean {
  try {
    let storage;
    storage = window[type];

    const testItem = '__faro_storage_test__';
    storage.setItem(testItem, testItem);
    storage.removeItem(testItem);
    return true;
  } catch (error) {
    // the above can throw
    faro.internalLogger?.info(`Web storage of type ${type} is not available. Reason: ${error}`);
    return false;
  }
}

export const isLocalStorageAvailable = isWebStorageAvailable('localStorage');

export function getItem(key: string): string | null {
  if (isLocalStorageAvailable) {
    return localStorage.getItem(key);
  }

  return null;
}

export function setItem(key: string, value: string): void {
  if (isLocalStorageAvailable) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      // do nothing
    }
  }
}

export function removeItem(key: string): void {
  if (isLocalStorageAvailable) {
    localStorage.removeItem(key);
  }
}
