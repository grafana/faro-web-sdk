import { faro, VERSION } from '@grafana/faro-core';
import type { Meta, MetaItem } from '@grafana/faro-core';

/**
 * SDK meta for React Native
 * Provides information about the Faro SDK and its integrations
 */
export const getSdkMeta = (): MetaItem<Pick<Meta, 'sdk'>> => {
  return () => ({
    sdk: {
      name: '@grafana/faro-react-native',
      version: VERSION,
      integrations: faro.config.instrumentations.map((instrumentation: { name: string; version: string }) => ({
        name: instrumentation.name,
        version: instrumentation.version,
      })),
    },
  });
};
