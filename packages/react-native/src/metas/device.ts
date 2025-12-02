import { Platform, Dimensions, NativeModules, I18nManager } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { unknownString } from '@grafana/faro-core';
import type { Meta, MetaItem } from '@grafana/faro-core';

/**
 * Extended browser meta with device-specific information
 */
export interface ExtendedBrowserMeta {
  // Standard browser meta fields
  name?: string;
  version?: string;
  os?: string;
  mobile?: boolean;
  userAgent?: string;
  language?: string;
  brands?: string;
  viewportWidth?: string;
  viewportHeight?: string;

  // Locale and language
  locale?: string;
  locales?: string;
  timezone?: string;

  // Network information
  carrier?: string;

  // Device characteristics
  batteryLevel?: string;
  isCharging?: string;
  lowPowerMode?: string;
  totalMemory?: string;
  usedMemory?: string;
  deviceType?: string;
  isEmulator?: string;
}

/**
 * Get locale information from React Native's built-in APIs
 * Falls back to unknown if APIs are unavailable
 */
function getLocaleInfo(): { locale: string; locales: string; timezone: string } {
  try {
    let locale = unknownString;
    let locales = unknownString;
    let timezone = unknownString;

    // Get locale information based on platform
    if (Platform.OS === 'ios') {
      const settings = NativeModules.SettingsManager?.settings;
      if (settings) {
        locale = settings.AppleLocale || settings.AppleLanguages?.[0] || unknownString;
        locales = Array.isArray(settings.AppleLanguages)
          ? settings.AppleLanguages.join(', ')
          : locale;
      }
    } else if (Platform.OS === 'android') {
      const localeIdentifier = I18nManager.getConstants?.()?.localeIdentifier;
      if (localeIdentifier) {
        locale = localeIdentifier;
        locales = localeIdentifier;
      }
    }

    // Get timezone - use Intl API if available
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || unknownString;
    } catch (e) {
      // Intl might not be available in some environments
      timezone = unknownString;
    }

    return { locale, locales, timezone };
  } catch (error) {
    // Gracefully handle any errors getting locale info
    return {
      locale: unknownString,
      locales: unknownString,
      timezone: unknownString,
    };
  }
}

/**
 * Device meta for React Native
 * Provides comprehensive device information including locale, network, and battery status
 */
export const getDeviceMeta = (): MetaItem<Pick<Meta, 'browser'>> => {
  return () => {
    const { width, height } = Dimensions.get('window');

    // Get device info synchronously where possible
    const brand = DeviceInfo.getBrand();
    const deviceId = DeviceInfo.getDeviceId();
    const model = DeviceInfo.getModel();
    const systemName = DeviceInfo.getSystemName();
    const systemVersion = DeviceInfo.getSystemVersion();
    const appVersion = DeviceInfo.getVersion();
    const isTablet = DeviceInfo.isTablet();

    // Locale and language information
    const { locale, locales, timezone } = getLocaleInfo();

    // Construct a user agent-like string
    const userAgent = `${systemName}/${systemVersion} (${brand}; ${model}; ${deviceId})`;

    // Determine OS string
    const os = `${systemName} ${systemVersion}`;

    // Get device name
    const deviceName = model || deviceId || unknownString;

    // Device type
    const deviceType = isTablet ? 'tablet' : 'mobile';

    // Synchronously available device info
    const isEmulator = DeviceInfo.isEmulatorSync();
    const totalMemory = DeviceInfo.getTotalMemorySync();
    const usedMemory = DeviceInfo.getUsedMemorySync();

    const browserMeta: ExtendedBrowserMeta = {
      name: systemName ?? unknownString,
      version: appVersion ?? unknownString,
      os: os ?? unknownString,
      mobile: !isTablet,
      userAgent: userAgent ?? unknownString,
      language: locale,
      brands: `${brand} ${deviceName}`,
      viewportWidth: `${width}`,
      viewportHeight: `${height}`,
      // Enhanced fields
      locale,
      locales,
      timezone,
      deviceType,
      isEmulator: String(isEmulator),
      totalMemory: String(totalMemory),
      usedMemory: String(usedMemory),
    };

    return {
      browser: browserMeta,
    };
  };
};

/**
 * Async device meta provider that includes battery and network information
 * These values are fetched asynchronously and cached
 */
export const getAsyncDeviceMeta = async (): Promise<Partial<ExtendedBrowserMeta>> => {
  try {
    const [batteryLevel, carrier, lowPowerMode] = await Promise.all([
      DeviceInfo.getBatteryLevel(),
      DeviceInfo.getCarrier(),
      DeviceInfo.isPowerSaveMode(),
    ]);

    // Check if device is charging
    const isCharging = await DeviceInfo.isBatteryCharging();

    return {
      batteryLevel: batteryLevel >= 0 ? `${Math.round(batteryLevel * 100)}%` : unknownString,
      isCharging: String(isCharging),
      lowPowerMode: String(lowPowerMode),
      carrier: carrier || unknownString,
    };
  } catch (error) {
    // Gracefully handle errors - return empty object if async info fails
    return {};
  }
};
