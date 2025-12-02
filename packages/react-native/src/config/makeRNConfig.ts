import type { Config } from '@grafana/faro-core';
import type { ReactNativeConfig } from './types';
import { getDeviceMeta } from '../metas/device';
import { createPageMeta } from '../metas/page';
import { getScreenMeta } from '../metas/screen';
import { getSdkMeta } from '../metas/sdk';

/**
 * Creates a full Faro config from React Native specific config
 */
export function makeRNConfig(config: ReactNativeConfig): Config {
  const { metas = [], ...rest } = config;

  // Default metas for React Native
  const defaultMetas = [getSdkMeta(), getDeviceMeta(), getScreenMeta(), createPageMeta()];

  return {
    ...rest,
    // Disable core batching since it uses browser APIs (document, window)
    // The FetchTransport handles its own batching via promiseBuffer
    batching: {
      enabled: false,
      sendTimeout: 250,
      itemLimit: 50,
    },
    // Enable session tracking by default
    sessionTracking: {
      enabled: true,
      ...config.sessionTracking,
    },
    metas: [...defaultMetas, ...metas],
  };
}
