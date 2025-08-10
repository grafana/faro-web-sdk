import { faro, VERSION } from '@grafana/faro-core';
import type { Meta, MetaItem } from '@grafana/faro-core';

// Full semver regex: supports major.minor.patch, prerelease, and build metadata
const fullSemverRegex =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

if (!fullSemverRegex.test(VERSION)) {
  faro.logger.warn(`Invalid SDK version "${VERSION}". Expected a valid semver (e.g., "1.2.3", "1.2.3-beta.1").`);
}

export const sdkMeta: MetaItem<Pick<Meta, 'sdk'>> = () => ({
  sdk: {
    name: '@grafana/faro-core',
    version: VERSION,
    integrations: faro.config.instrumentations.map(({ name, version }) => ({ name, version })),
  },
});
