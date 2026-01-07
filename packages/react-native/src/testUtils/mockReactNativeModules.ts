/**
 * Mock React Native global modules for testing
 */
export function mockReactNativeModules(): void {
  // Mock Platform
  jest.mock('react-native/Libraries/Utilities/Platform', () => ({
    OS: 'ios',
    Version: '16.0',
    select: jest.fn((obj) => obj.ios),
  }));

  // Mock Dimensions
  jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
    get: jest.fn(() => ({
      width: 375,
      height: 812,
      scale: 3,
      fontScale: 1,
    })),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
}
