import { getTsdownConfigBase } from '../../tsdown.config.base.js';

export default getTsdownConfigBase({
  bundleName: 'faro-web-tracing',
  globalName: 'GrafanaFaroWebTracing',
  bundleExternals: {
    '@grafana/faro-web-sdk': 'GrafanaFaroWebSdk',
  },
  bundleInlines: [/^@opentelemetry\//],
});
