/**
 * Mock react-native-device-info for testing
 */
export function mockDeviceInfo(): void {
  jest.mock('react-native-device-info', () => ({
    default: {
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
    },
  }));
}
