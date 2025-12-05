import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

import { VERSION } from '@grafana/faro-core';

import { getSessionAttributes } from './sessionAttributes';

// Mock react-native-device-info
jest.mock('react-native-device-info', () => ({
  getUniqueId: jest.fn(),
  getSystemName: jest.fn(),
  getSystemVersion: jest.fn(),
  getManufacturerSync: jest.fn(),
  getModel: jest.fn(),
  getDeviceNameSync: jest.fn(),
  getBrand: jest.fn(),
  isEmulatorSync: jest.fn(),
  getApiLevel: jest.fn(),
}));

describe('sessionAttributes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSessionAttributes', () => {
    describe('iOS', () => {
      beforeEach(() => {
        // Mock iOS platform
        (Platform as any).OS = 'ios';
        Object.defineProperty(Platform, 'constants', {
          value: {
            reactNativeVersion: {
              major: 0,
              minor: 75,
              patch: 1,
            },
          },
          writable: true,
        });
      });

      it('should collect all iOS device attributes', async () => {
        // Setup mocks for iOS device
        (DeviceInfo.getUniqueId as jest.Mock).mockResolvedValue('ios-device-uuid-123');
        (DeviceInfo.getSystemName as jest.Mock).mockReturnValue('iOS');
        (DeviceInfo.getSystemVersion as jest.Mock).mockReturnValue('17.0');
        (DeviceInfo.getManufacturerSync as jest.Mock).mockReturnValue('Apple');
        (DeviceInfo.getModel as jest.Mock).mockReturnValue('iPhone16,1');
        (DeviceInfo.getDeviceNameSync as jest.Mock).mockReturnValue('iPhone 15 Pro');
        (DeviceInfo.getBrand as jest.Mock).mockReturnValue('Apple');
        (DeviceInfo.isEmulatorSync as jest.Mock).mockReturnValue(false);

        const attributes = await getSessionAttributes();

        expect(attributes).toEqual({
          faro_sdk_version: VERSION,
          react_native_version: '0.75.1',
          device_os: 'iOS',
          device_os_version: '17.0',
          device_os_detail: 'iOS 17.0',
          device_manufacturer: 'apple',
          device_model: 'iPhone16,1',
          device_model_name: 'iPhone 15 Pro',
          device_brand: 'Apple',
          device_is_physical: 'true',
          device_id: 'ios-device-uuid-123',
        });
      });

      it('should identify emulator devices', async () => {
        (DeviceInfo.getUniqueId as jest.Mock).mockResolvedValue('emulator-uuid');
        (DeviceInfo.getSystemName as jest.Mock).mockReturnValue('iOS');
        (DeviceInfo.getSystemVersion as jest.Mock).mockReturnValue('17.0');
        (DeviceInfo.getManufacturerSync as jest.Mock).mockReturnValue('Apple');
        (DeviceInfo.getModel as jest.Mock).mockReturnValue('x86_64');
        (DeviceInfo.getDeviceNameSync as jest.Mock).mockReturnValue('iPhone Simulator');
        (DeviceInfo.getBrand as jest.Mock).mockReturnValue('Apple');
        (DeviceInfo.isEmulatorSync as jest.Mock).mockReturnValue(true);

        const attributes = await getSessionAttributes();

        expect(attributes.device_is_physical).toBe('false');
        expect(attributes.device_model_name).toBe('iPhone Simulator');
      });

      it('should handle iOS with different OS versions', async () => {
        (DeviceInfo.getUniqueId as jest.Mock).mockResolvedValue('device-uuid');
        (DeviceInfo.getSystemName as jest.Mock).mockReturnValue('iOS');
        (DeviceInfo.getSystemVersion as jest.Mock).mockReturnValue('16.4');
        (DeviceInfo.getManufacturerSync as jest.Mock).mockReturnValue('Apple');
        (DeviceInfo.getModel as jest.Mock).mockReturnValue('iPhone15,2');
        (DeviceInfo.getDeviceNameSync as jest.Mock).mockReturnValue('iPhone 14 Pro');
        (DeviceInfo.getBrand as jest.Mock).mockReturnValue('Apple');
        (DeviceInfo.isEmulatorSync as jest.Mock).mockReturnValue(false);

        const attributes = await getSessionAttributes();

        expect(attributes.device_os_version).toBe('16.4');
        expect(attributes.device_os_detail).toBe('iOS 16.4');
      });
    });

    describe('Android', () => {
      beforeEach(() => {
        // Mock Android platform
        (Platform as any).OS = 'android';
        Object.defineProperty(Platform, 'constants', {
          value: {
            reactNativeVersion: {
              major: 0,
              minor: 75,
              patch: 1,
            },
          },
          writable: true,
        });
      });

      it('should collect all Android device attributes', async () => {
        // Setup mocks for Android device
        (DeviceInfo.getUniqueId as jest.Mock).mockResolvedValue('android-device-uuid-456');
        (DeviceInfo.getSystemName as jest.Mock).mockReturnValue('Android');
        (DeviceInfo.getSystemVersion as jest.Mock).mockReturnValue('15');
        (DeviceInfo.getManufacturerSync as jest.Mock).mockReturnValue('Samsung');
        (DeviceInfo.getModel as jest.Mock).mockReturnValue('SM-A155F');
        (DeviceInfo.getDeviceNameSync as jest.Mock).mockReturnValue('SM-A155F');
        (DeviceInfo.getBrand as jest.Mock).mockReturnValue('samsung');
        (DeviceInfo.isEmulatorSync as jest.Mock).mockReturnValue(false);
        (DeviceInfo.getApiLevel as jest.Mock).mockResolvedValue(35);

        const attributes = await getSessionAttributes();

        expect(attributes).toEqual({
          faro_sdk_version: VERSION,
          react_native_version: '0.75.1',
          device_os: 'Android',
          device_os_version: '15',
          device_os_detail: 'Android 15 (SDK 35)',
          device_manufacturer: 'samsung',
          device_model: 'SM-A155F',
          device_model_name: 'SM-A155F',
          device_brand: 'samsung',
          device_is_physical: 'true',
          device_id: 'android-device-uuid-456',
        });
      });

      it('should identify Android emulator devices', async () => {
        (DeviceInfo.getUniqueId as jest.Mock).mockResolvedValue('emulator-uuid');
        (DeviceInfo.getSystemName as jest.Mock).mockReturnValue('Android');
        (DeviceInfo.getSystemVersion as jest.Mock).mockReturnValue('13');
        (DeviceInfo.getManufacturerSync as jest.Mock).mockReturnValue('Google');
        (DeviceInfo.getModel as jest.Mock).mockReturnValue('sdk_gphone64_arm64');
        (DeviceInfo.getDeviceNameSync as jest.Mock).mockReturnValue('Pixel 5');
        (DeviceInfo.getBrand as jest.Mock).mockReturnValue('google');
        (DeviceInfo.isEmulatorSync as jest.Mock).mockReturnValue(true);
        (DeviceInfo.getApiLevel as jest.Mock).mockResolvedValue(33);

        const attributes = await getSessionAttributes();

        expect(attributes.device_is_physical).toBe('false');
        expect(attributes.device_model).toBe('sdk_gphone64_arm64');
      });

      it('should handle Android without API level', async () => {
        (DeviceInfo.getUniqueId as jest.Mock).mockResolvedValue('device-uuid');
        (DeviceInfo.getSystemName as jest.Mock).mockReturnValue('Android');
        (DeviceInfo.getSystemVersion as jest.Mock).mockReturnValue('12');
        (DeviceInfo.getManufacturerSync as jest.Mock).mockReturnValue('Xiaomi');
        (DeviceInfo.getModel as jest.Mock).mockReturnValue('M2101K7AG');
        (DeviceInfo.getDeviceNameSync as jest.Mock).mockReturnValue('M2101K7AG');
        (DeviceInfo.getBrand as jest.Mock).mockReturnValue('xiaomi');
        (DeviceInfo.isEmulatorSync as jest.Mock).mockReturnValue(false);
        (DeviceInfo.getApiLevel as jest.Mock).mockRejectedValue(new Error('API level unavailable'));

        const attributes = await getSessionAttributes();

        // Should fallback to version without SDK level
        expect(attributes.device_os_detail).toBe('Android 12');
      });
    });

    describe('React Native version parsing', () => {
      it('should parse version with prerelease', () => {
        Object.defineProperty(Platform, 'constants', {
          value: {
            reactNativeVersion: {
              major: 0,
              minor: 76,
              patch: 0,
              prerelease: 1,
            },
          },
          writable: true,
        });

        (DeviceInfo.getUniqueId as jest.Mock).mockResolvedValue('uuid');
        (DeviceInfo.getSystemName as jest.Mock).mockReturnValue('iOS');
        (DeviceInfo.getSystemVersion as jest.Mock).mockReturnValue('17.0');
        (DeviceInfo.getManufacturerSync as jest.Mock).mockReturnValue('Apple');
        (DeviceInfo.getModel as jest.Mock).mockReturnValue('iPhone16,1');
        (DeviceInfo.getDeviceNameSync as jest.Mock).mockReturnValue('iPhone 15 Pro');
        (DeviceInfo.getBrand as jest.Mock).mockReturnValue('Apple');
        (DeviceInfo.isEmulatorSync as jest.Mock).mockReturnValue(false);

        return getSessionAttributes().then((attributes) => {
          expect(attributes.react_native_version).toBe('0.76.0-rc.1');
        });
      });

      it('should fallback to unknown if version unavailable', () => {
        Object.defineProperty(Platform, 'constants', {
          value: {},
          writable: true,
        });

        (DeviceInfo.getUniqueId as jest.Mock).mockResolvedValue('uuid');
        (DeviceInfo.getSystemName as jest.Mock).mockReturnValue('iOS');
        (DeviceInfo.getSystemVersion as jest.Mock).mockReturnValue('17.0');
        (DeviceInfo.getManufacturerSync as jest.Mock).mockReturnValue('Apple');
        (DeviceInfo.getModel as jest.Mock).mockReturnValue('iPhone16,1');
        (DeviceInfo.getDeviceNameSync as jest.Mock).mockReturnValue('iPhone 15 Pro');
        (DeviceInfo.getBrand as jest.Mock).mockReturnValue('Apple');
        (DeviceInfo.isEmulatorSync as jest.Mock).mockReturnValue(false);

        return getSessionAttributes().then((attributes) => {
          expect(attributes.react_native_version).toBe('unknown');
        });
      });
    });

    describe('Error handling', () => {
      it('should gracefully handle DeviceInfo errors and return fallback values', async () => {
        // Mock all DeviceInfo methods to throw errors
        (DeviceInfo.getUniqueId as jest.Mock).mockRejectedValue(new Error('Failed to get UUID'));
        (DeviceInfo.getSystemName as jest.Mock).mockImplementation(() => {
          throw new Error('Failed to get system name');
        });
        (DeviceInfo.getSystemVersion as jest.Mock).mockImplementation(() => {
          throw new Error('Failed to get system version');
        });
        (DeviceInfo.getManufacturerSync as jest.Mock).mockImplementation(() => {
          throw new Error('Failed to get manufacturer');
        });
        (DeviceInfo.getModel as jest.Mock).mockImplementation(() => {
          throw new Error('Failed to get model');
        });
        (DeviceInfo.getDeviceNameSync as jest.Mock).mockImplementation(() => {
          throw new Error('Failed to get device name');
        });
        (DeviceInfo.getBrand as jest.Mock).mockImplementation(() => {
          throw new Error('Failed to get brand');
        });
        (DeviceInfo.isEmulatorSync as jest.Mock).mockImplementation(() => {
          throw new Error('Failed to check emulator');
        });

        const attributes = await getSessionAttributes();

        // Should return minimal attributes with fallbacks
        expect(attributes).toEqual({
          faro_sdk_version: VERSION,
          react_native_version: expect.any(String),
          device_os: expect.stringMatching(/iOS|Android/),
          device_os_version: 'unknown',
          device_os_detail: 'unknown',
          device_manufacturer: 'unknown',
          device_model: 'unknown',
          device_model_name: 'unknown',
          device_brand: 'unknown',
          device_is_physical: 'true',
          device_id: 'unknown',
        });
      });

      it('should handle partial DeviceInfo failures', async () => {
        // Some methods work, others fail
        // Note: If any method throws, the entire catch block returns fallback values
        (DeviceInfo.getUniqueId as jest.Mock).mockResolvedValue('valid-uuid');
        (DeviceInfo.getSystemName as jest.Mock).mockReturnValue('iOS');
        (DeviceInfo.getSystemVersion as jest.Mock).mockReturnValue('17.0');
        (DeviceInfo.getManufacturerSync as jest.Mock).mockImplementation(() => {
          throw new Error('Manufacturer unavailable');
        });
        (DeviceInfo.getModel as jest.Mock).mockReturnValue('iPhone16,1');
        (DeviceInfo.getDeviceNameSync as jest.Mock).mockReturnValue('iPhone 15 Pro');
        (DeviceInfo.getBrand as jest.Mock).mockReturnValue('Apple');
        (DeviceInfo.isEmulatorSync as jest.Mock).mockReturnValue(false);

        const attributes = await getSessionAttributes();

        // Due to the catch-all error handling, when any method throws,
        // the entire function returns fallback values
        expect(attributes.device_id).toBe('unknown');
        expect(attributes.device_os).toMatch(/iOS|Android/);
        expect(attributes.device_model).toBe('unknown');
        expect(attributes.device_manufacturer).toBe('unknown');
      });
    });

    describe('Manufacturer normalization', () => {
      it('should lowercase manufacturer names', async () => {
        (DeviceInfo.getUniqueId as jest.Mock).mockResolvedValue('uuid');
        (DeviceInfo.getSystemName as jest.Mock).mockReturnValue('Android');
        (DeviceInfo.getSystemVersion as jest.Mock).mockReturnValue('14');
        (DeviceInfo.getManufacturerSync as jest.Mock).mockReturnValue('SAMSUNG');
        (DeviceInfo.getModel as jest.Mock).mockReturnValue('SM-G998B');
        (DeviceInfo.getDeviceNameSync as jest.Mock).mockReturnValue('Galaxy S21 Ultra');
        (DeviceInfo.getBrand as jest.Mock).mockReturnValue('samsung');
        (DeviceInfo.isEmulatorSync as jest.Mock).mockReturnValue(false);
        (DeviceInfo.getApiLevel as jest.Mock).mockResolvedValue(34);

        const attributes = await getSessionAttributes();

        expect(attributes.device_manufacturer).toBe('samsung');
      });

      it('should handle mixed case manufacturer names', async () => {
        (DeviceInfo.getUniqueId as jest.Mock).mockResolvedValue('uuid');
        (DeviceInfo.getSystemName as jest.Mock).mockReturnValue('Android');
        (DeviceInfo.getSystemVersion as jest.Mock).mockReturnValue('14');
        (DeviceInfo.getManufacturerSync as jest.Mock).mockReturnValue('OnePlus');
        (DeviceInfo.getModel as jest.Mock).mockReturnValue('LE2121');
        (DeviceInfo.getDeviceNameSync as jest.Mock).mockReturnValue('OnePlus 9 Pro');
        (DeviceInfo.getBrand as jest.Mock).mockReturnValue('OnePlus');
        (DeviceInfo.isEmulatorSync as jest.Mock).mockReturnValue(false);
        (DeviceInfo.getApiLevel as jest.Mock).mockResolvedValue(34);

        const attributes = await getSessionAttributes();

        expect(attributes.device_manufacturer).toBe('oneplus');
      });
    });

    describe('SDK version', () => {
      it('should always include SDK version from @grafana/faro-core', async () => {
        (DeviceInfo.getUniqueId as jest.Mock).mockResolvedValue('uuid');
        (DeviceInfo.getSystemName as jest.Mock).mockReturnValue('iOS');
        (DeviceInfo.getSystemVersion as jest.Mock).mockReturnValue('17.0');
        (DeviceInfo.getManufacturerSync as jest.Mock).mockReturnValue('Apple');
        (DeviceInfo.getModel as jest.Mock).mockReturnValue('iPhone16,1');
        (DeviceInfo.getDeviceNameSync as jest.Mock).mockReturnValue('iPhone 15 Pro');
        (DeviceInfo.getBrand as jest.Mock).mockReturnValue('Apple');
        (DeviceInfo.isEmulatorSync as jest.Mock).mockReturnValue(false);

        const attributes = await getSessionAttributes();

        expect(attributes.faro_sdk_version).toBe(VERSION);
        expect(attributes.faro_sdk_version).toMatch(/^\d+\.\d+\.\d+/);
      });
    });
  });
});
