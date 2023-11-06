import { faro } from '@grafana/faro-core';

export const webStorageType = {
  session: 'sessionStorage',
  local: 'localStorage',
} as const;

type StorageMechanism = (typeof webStorageType)[keyof typeof webStorageType];

// TODO: remove default storage type from all function

/**
 * Check if selected web storage mechanism is available.
 * @param type storage mechanism to test availability for.
 * @returns
 */
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

/**
 * Get item from SessionStorage or LocalStorage.
 * @param key: the item key.
 * @param webStorageMechanism: wether the item shall be received form local storage or session storage. Defaults to local storage.
 */
export function getItem(key: string, webStorageMechanism: StorageMechanism): string | null {
  if (isWebStorageTypeAvailable(webStorageMechanism)) {
    return window[webStorageMechanism].getItem(key);
  }

  return null;
}

/**
 * Store item in SessionStorage or LocalStorage.
 * @param key: the item key.
 * @param value: the item data.
 * @param webStorageMechanism: wether the item shall be received form local storage or session storage. Defaults to local storage.
 */
export function setItem(key: string, value: string, webStorageMechanism: StorageMechanism): void {
  if (isWebStorageTypeAvailable(webStorageMechanism)) {
    try {
      window[webStorageMechanism].setItem(key, value);
    } catch (error) {
      // do nothing
    }
  }
}

/**
 * Remove item from SessionStorage or LocalStorage.
 * @param key: the item key.
 * @param webStorageMechanism: wether the item shall be received form local storage or session storage. Defaults to local storage.
 */
export function removeItem(key: string, webStorageMechanism: StorageMechanism): void {
  if (isWebStorageTypeAvailable(webStorageMechanism)) {
    window[webStorageMechanism].removeItem(key);
  }
}

export const isLocalStorageAvailable = isWebStorageAvailable(webStorageType.local);
export const isSessionStorageAvailable = isWebStorageAvailable(webStorageType.session);

function isWebStorageTypeAvailable(webStorageMechanism: StorageMechanism) {
  if (webStorageMechanism === webStorageType.local) {
    return isLocalStorageAvailable;
  }

  if (webStorageMechanism === webStorageType.session) {
    return isSessionStorageAvailable;
  }

  return false;
}
