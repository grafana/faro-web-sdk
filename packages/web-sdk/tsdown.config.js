const { getTsdownConfigBase } = require('../../tsdown.config.base.js');

module.exports = getTsdownConfigBase({
  bundleName: 'faro-web-sdk',
  globalName: 'GrafanaFaroWebSdk',
  // The bundle is self contained: faro-core and the browser dependencies are all inlined. These are
  // regular expressions rather than plain names so that subpath imports such as
  // "web-vitals/attribution" are matched too.
  bundleInlines: [/^@grafana\/faro-core/, /^ua-parser-js/, /^web-vitals/],
});
