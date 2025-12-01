import type { Config } from '@grafana/faro-core';
import type { ReactNativeConfig } from './types';
import { getDeviceMeta } from '../metas/device';
import { getScreenMeta } from '../metas/screen';
import { getSdkMeta } from '../metas/sdk';

/**
 * Creates a full Faro config from React Native specific config
 */
export function makeRNConfig(config: ReactNativeConfig): Config {
  const { metas = [], ...rest } = config;

  // Default metas for React Native
  const defaultMetas = [getSdkMeta(), getDeviceMeta(), getScreenMeta()];

  return {
    ...rest,
    metas: [...defaultMetas, ...metas],
  };
}
