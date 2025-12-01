import { Platform, Dimensions } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { unknownString } from '@grafana/faro-core';
import type { Meta, MetaItem } from '@grafana/faro-core';

/**
 * Device meta for React Native
 * Provides device information similar to browser meta in web-sdk
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

    // Construct a user agent-like string
    const userAgent = `${systemName}/${systemVersion} (${brand}; ${model}; ${deviceId})`;

    // Determine OS string
    const os = `${systemName} ${systemVersion}`;

    // Get device name
    const deviceName = model || deviceId || unknownString;

    return {
      browser: {
        name: systemName ?? unknownString,
        version: appVersion ?? unknownString,
        os: os ?? unknownString,
        mobile: !isTablet,
        userAgent: userAgent ?? unknownString,
        language: Platform.OS ?? unknownString,
        brands: `${brand} ${deviceName}`,
        viewportWidth: `${width}`,
        viewportHeight: `${height}`,
      },
    };
  };
};
