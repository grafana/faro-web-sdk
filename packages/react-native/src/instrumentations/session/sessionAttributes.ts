import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

import { VERSION } from '@grafana/faro-core';

/**
 * Session attributes matching Flutter SDK format
 * These attributes are automatically included with every telemetry event
 */
export interface SessionAttributes {
  /** SDK version (e.g., "2.0.2") */
  faro_sdk_version: string;

  /** React Native version (e.g., "0.75.1") */
  react_native_version: string;

  /** Operating system ("iOS" or "Android") */
  device_os: string;

  /** OS version (e.g., "17.0" for iOS, "15" for Android) */
  device_os_version: string;

  /** Detailed OS info (e.g., "iOS 17.0" or "Android 15 (SDK 35)") */
  device_os_detail: string;

  /** Device manufacturer (e.g., "apple", "samsung") */
  device_manufacturer: string;

  /** Raw model identifier (e.g., "iPhone16,1", "SM-A155F") */
  device_model: string;

  /** Human-readable model name (e.g., "iPhone 15 Pro") */
  device_model_name: string;

  /** Device brand (e.g., "iPhone", "samsung") */
  device_brand: string;

  /** Whether device is physical or emulator ("true" or "false") */
  device_is_physical: string;

  /** Unique device ID (UUID) */
  device_id: string;
}

/**
 * Get React Native version from Platform
 * Returns "unknown" if not available
 */
function getReactNativeVersion(): string {
  try {
    // Platform.constants.reactNativeVersion is an object like { major: 0, minor: 75, patch: 1 }
    const version = Platform.constants.reactNativeVersion;
    if (version && typeof version === 'object') {
      const { major, minor, patch, prerelease } = version as {
        major: number;
        minor: number;
        patch: number;
        prerelease?: number;
      };
      let versionString = `${major}.${minor}.${patch}`;
      if (prerelease) {
        versionString += `-rc.${prerelease}`;
      }
      return versionString;
    }
    return 'unknown';
  } catch (_error) {
    return 'unknown';
  }
}

/**
 * Get device ID using react-native-device-info
 * Returns unique device identifier or 'unknown' on error
 */
async function getDeviceId(): Promise<string> {
  try {
    // getUniqueId returns a UUID that persists across app installations
    return await DeviceInfo.getUniqueId();
  } catch (_error) {
    return 'unknown';
  }
}

/**
 * Get OS detail string matching Flutter SDK format
 * iOS: "iOS 17.0"
 * Android: "Android 15 (SDK 35)"
 */
async function getDeviceOsDetail(): Promise<string> {
  const systemName = DeviceInfo.getSystemName();
  const systemVersion = DeviceInfo.getSystemVersion();

  if (Platform.OS === 'android') {
    try {
      const apiLevel = await DeviceInfo.getApiLevel();
      return `${systemName} ${systemVersion} (SDK ${apiLevel})`;
    } catch (_error) {
      return `${systemName} ${systemVersion}`;
    }
  }

  return `${systemName} ${systemVersion}`;
}

/**
 * Get all session attributes matching Flutter SDK format
 * These attributes are automatically included with every telemetry event
 *
 * Attribute mapping to Flutter SDK:
 * - faro_sdk_version: SDK version
 * - react_native_version: Equivalent to dart_version in Flutter
 * - device_os: Operating system (iOS/Android)
 * - device_os_version: OS version
 * - device_os_detail: Detailed OS info with SDK level for Android
 * - device_manufacturer: Manufacturer (apple, samsung, etc.)
 * - device_model: Raw model identifier (iPhone16,1, SM-A155F)
 * - device_model_name: Human-readable model name
 * - device_brand: Device brand
 * - device_is_physical: Physical device or emulator
 * - device_id: Unique device identifier (UUID)
 */
export async function getSessionAttributes(): Promise<SessionAttributes> {
  try {
    // Get device ID asynchronously
    const deviceId = await getDeviceId();
    const deviceOsDetail = await getDeviceOsDetail();

    // Get synchronous device info
    const systemName = DeviceInfo.getSystemName();
    const systemVersion = DeviceInfo.getSystemVersion();
    const manufacturer = DeviceInfo.getManufacturerSync();
    const model = DeviceInfo.getModel();
    const deviceName = DeviceInfo.getDeviceNameSync();
    const brand = DeviceInfo.getBrand();
    const isEmulator = DeviceInfo.isEmulatorSync();

    // React Native version (equivalent to dart_version in Flutter)
    const reactNativeVersion = getReactNativeVersion();

    const attributes: SessionAttributes = {
      faro_sdk_version: VERSION,
      react_native_version: reactNativeVersion,
      device_os: systemName,
      device_os_version: systemVersion,
      device_os_detail: deviceOsDetail,
      device_manufacturer: manufacturer.toLowerCase(),
      device_model: model,
      device_model_name: deviceName,
      device_brand: brand,
      device_is_physical: String(!isEmulator),
      device_id: deviceId,
    };

    return attributes;
  } catch {
    // If anything fails, return minimal attributes
    return {
      faro_sdk_version: VERSION,
      react_native_version: getReactNativeVersion(),
      device_os: Platform.OS === 'ios' ? 'iOS' : 'Android',
      device_os_version: 'unknown',
      device_os_detail: 'unknown',
      device_manufacturer: 'unknown',
      device_model: 'unknown',
      device_model_name: 'unknown',
      device_brand: 'unknown',
      device_is_physical: 'true',
      device_id: 'unknown',
    };
  }
}
