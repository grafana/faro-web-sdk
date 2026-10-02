import { getTsdownConfigBase } from '../../tsdown.config.base.js';

export default getTsdownConfigBase({
  bundleName: 'faro-core',
  globalName: 'GrafanaFaroCore',
  bundleInlines: [/^@opentelemetry\//],
});
