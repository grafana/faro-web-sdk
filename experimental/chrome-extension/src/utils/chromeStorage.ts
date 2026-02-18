export interface ChromeStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export function createChromeStorageAdapter(): ChromeStorageAdapter {
  return {
    async getItem(key: string): Promise<string | null> {
      const result = await chrome.storage.local.get(key);
      return result[key] ?? null;
    },

    async setItem(key: string, value: string): Promise<void> {
      await chrome.storage.local.set({ [key]: value });
    },

    async removeItem(key: string): Promise<void> {
      await chrome.storage.local.remove(key);
    },
  };
}
