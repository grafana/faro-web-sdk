const { getTsdownConfigBase } = require('../../tsdown.config.base.js');

module.exports = getTsdownConfigBase({
  bundleName: 'faro-transport-otlp-http',
  globalName: 'GrafanaFaroTransportOtlpHttp',
  bundleInlines: [/^@opentelemetry\//],
});
