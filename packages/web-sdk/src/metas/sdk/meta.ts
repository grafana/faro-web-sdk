import { faro, VERSION } from '@grafana/faro-core';
import type { Meta, MetaItem } from '@grafana/faro-core';
import semver from 'semver';

// Validate the VERSION string using semver
if (!semver.valid(VERSION)) {
  throw new Error(`Invalid SDK version "${VERSION}". Expected a valid semver string like "1.2.3".`);
}

export const sdkMeta: MetaItem<Pick<Meta, 'sdk'>> = () => ({
  sdk: {
    name: '@grafana/faro-core',
    version: VERSION,
    integrations: faro.config.instrumentations.map(({ name, version }) => ({ name, version })),
  },
});
