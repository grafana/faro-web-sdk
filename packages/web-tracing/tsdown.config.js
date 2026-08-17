const { getTsdownConfigBase } = require('../../tsdown.config.base.js');

module.exports = getTsdownConfigBase({
  bundleName: 'faro-web-tracing',
  globalName: 'GrafanaFaroWebTracing',
  bundleExternals: {
    '@grafana/faro-web-sdk': 'GrafanaFaroWebSdk',
  },
  bundleInlines: [/^@opentelemetry\//],
});
