const { getTsdownConfigBase } = require('../../tsdown.config.base.js');

module.exports = getTsdownConfigBase({
  bundleName: 'faro-instrumentation-replay',
  globalName: 'GrafanaFaroInstrumentationReplay',
  bundleInlines: [/^@grafana\/faro-core/, /^@grafana\/rrweb/],
});
