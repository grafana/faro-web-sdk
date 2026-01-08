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
// Using a global storage object that can be accessed by tests
(global as any).mockAsyncStorage = {};

const mockAsyncStorageImpl = {
  getItem: jest.fn((key: string) => {
    const storage = (global as any).mockAsyncStorage;
    return Promise.resolve(storage[key] ?? null);
  }),
  setItem: jest.fn((key: string, value: string) => {
    const storage = (global as any).mockAsyncStorage;
    storage[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    const storage = (global as any).mockAsyncStorage;
    delete storage[key];
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    (global as any).mockAsyncStorage = {};
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => {
    const storage = (global as any).mockAsyncStorage;
    return Promise.resolve(Object.keys(storage));
  }),
  multiGet: jest.fn((keys: string[]) => {
    const storage = (global as any).mockAsyncStorage;
    return Promise.resolve(keys.map((key) => [key, storage[key] ?? null]));
  }),
  multiSet: jest.fn((keyValuePairs: Array<[string, string]>) => {
    const storage = (global as any).mockAsyncStorage;
    keyValuePairs.forEach(([key, value]) => {
      storage[key] = value;
    });
    return Promise.resolve();
  }),
  multiRemove: jest.fn((keys: string[]) => {
    const storage = (global as any).mockAsyncStorage;
    keys.forEach((key) => delete storage[key]);
    return Promise.resolve();
  }),
};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: mockAsyncStorageImpl,
}));

// Ensure Platform.Version is properly mocked
// The react-native preset mocks Platform, but we need to ensure Version is accessible
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  Version: '16.0',
  select: jest.fn((obj) => obj.ios || obj.default),
}), { virtual: true });

// Mock fetch API globals for HTTP instrumentation tests
if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    ok: boolean;
    status: number;
    statusText: string;
    body: any;

    constructor(body?: BodyInit | null, init?: ResponseInit) {
      this.body = body;
      this.status = init?.status ?? 200;
      this.statusText = init?.statusText ?? 'OK';
      this.ok = this.status >= 200 && this.status < 300;
    }
  } as any;
}

if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    url: string;
    method: string;

    constructor(input: RequestInfo | URL, init?: RequestInit) {
      if (typeof input === 'string') {
        this.url = input;
        this.method = init?.method ?? 'GET';
      } else if (input instanceof URL) {
        this.url = input.href;
        this.method = init?.method ?? 'GET';
      } else {
        // input is a Request object
        const req = input as Request;
        this.url = req.url;
        this.method = init?.method ?? req.method ?? 'GET';
      }
    }
  } as any;
}

if (typeof global.URL === 'undefined') {
  global.URL = class URL {
    href: string;

    constructor(url: string) {
      this.href = url;
    }
  } as any;
}
