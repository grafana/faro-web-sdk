/**
 * Mock AsyncStorage for testing
 */
export function mockAsyncStorage(): {
  storage: Record<string, string>;
  mockClear: () => void;
} {
  const storage: Record<string, string> = {};

  const mockAsyncStorage = {
    getItem: jest.fn((key: string) => Promise.resolve(storage[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      storage[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete storage[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      Object.keys(storage).forEach((key) => delete storage[key]);
      return Promise.resolve();
    }),
    getAllKeys: jest.fn(() => Promise.resolve(Object.keys(storage))),
    multiGet: jest.fn((keys: string[]) =>
      Promise.resolve(keys.map((key) => [key, storage[key] ?? null]))
    ),
    multiSet: jest.fn((keyValuePairs: Array<[string, string]>) => {
      keyValuePairs.forEach(([key, value]) => {
        storage[key] = value;
      });
      return Promise.resolve();
    }),
    multiRemove: jest.fn((keys: string[]) => {
      keys.forEach((key) => delete storage[key]);
      return Promise.resolve();
    }),
  };

  jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

  return {
    storage,
    mockClear: () => {
      Object.keys(storage).forEach((key) => delete storage[key]);
      jest.clearAllMocks();
    },
  };
}
