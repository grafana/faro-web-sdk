const { getTsdownConfigBase } = require('../../tsdown.config.base.js');

module.exports = getTsdownConfigBase({
  bundleName: 'faro-core',
  globalName: 'GrafanaFaroCore',
  bundleInlines: [/^@opentelemetry\//],
});
