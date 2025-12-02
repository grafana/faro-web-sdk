/**
 * Jest setup file for React Native tests
 * Mocks third-party React Native dependencies
 */

// Mock react-native-device-info
jest.mock('react-native-device-info', () => {
  const mockDeviceInfo = {
    getBrand: jest.fn(() => 'Apple'),
    getDeviceId: jest.fn(() => 'iPhone14,2'),
    getModel: jest.fn(() => 'iPhone 13 Pro'),
    getSystemName: jest.fn(() => 'iOS'),
    getSystemVersion: jest.fn(() => '16.0'),
    getVersion: jest.fn(() => '1.0.0'),
    isTablet: jest.fn(() => false),
    isEmulatorSync: jest.fn(() => false),
    getTotalMemorySync: jest.fn(() => 6442450944), // 6GB in bytes
    getUsedMemorySync: jest.fn(() => 2147483648), // 2GB in bytes
    getBatteryLevel: jest.fn(() => Promise.resolve(0.75)),
    getCarrier: jest.fn(() => Promise.resolve('T-Mobile')),
    isPowerSaveMode: jest.fn(() => Promise.resolve(false)),
    isBatteryCharging: jest.fn(() => Promise.resolve(false)),
  };
  return {
    __esModule: true,
    default: mockDeviceInfo,
    ...mockDeviceInfo,
  };
});

// Mock @react-native-async-storage/async-storage
const storage: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
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
    multiGet: jest.fn((keys: string[]) => Promise.resolve(keys.map((key) => [key, storage[key] ?? null]))),
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
  },
}));

// Ensure Platform.Version is properly mocked
// The react-native preset mocks Platform, but we need to ensure Version is accessible
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  Version: '16.0',
  select: jest.fn((obj) => obj.ios || obj.default),
}), { virtual: true });
