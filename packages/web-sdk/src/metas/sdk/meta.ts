import { faro } from '@grafana/faro-core';
import type { Meta, MetaItem } from '@grafana/faro-core';

// Official semver v2.0.0 regex from https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
const fullSemverRegex =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|[0-9A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|[0-9A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

export const sdkMeta: MetaItem<Pick<Meta, 'sdk'>> = (currentVersion?: string) => {
  if (
    faro.config.validateSdkMeta &&
    (typeof currentVersion !== 'string' || !fullSemverRegex.test(currentVersion))
  ) {
    faro.internalLogger.warn(
      `Invalid SDK version "${currentVersion}". Expected a valid semver (e.g., "1.2.3", "1.2.3-beta.1").`
    );
  }

  return {
    sdk: {
      name: '@grafana/faro-core',
      version: currentVersion,
      integrations: faro.config.instrumentations.map(({ name, version }) => ({ name, version })),
    },
  };
};