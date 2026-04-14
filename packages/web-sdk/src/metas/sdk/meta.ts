import { VERSION } from '@grafana/faro-core';
import type { Instrumentation, Meta, MetaItem } from '@grafana/faro-core';

export function createSdkMeta(instrumentations: Instrumentation[]): MetaItem<Pick<Meta, 'sdk'>> {
  return () => ({
    sdk: {
      name: 'faro-web',
      version: VERSION,
      integrations: instrumentations.map((instr) => ({
        name: instr.name,
        version: instr.version,
      })),
    },
  });
}

export const sdkMeta: MetaItem<Pick<Meta, 'sdk'>> = () => ({
  sdk: {
    name: 'faro-web',
    version: VERSION,
  },
});
