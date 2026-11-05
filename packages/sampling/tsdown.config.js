const { getTsdownConfigBase } = require('../../tsdown.config.base.js');

module.exports = getTsdownConfigBase({
  bundleName: 'faro-sampling',
  globalName: 'GrafanaFaroSampling',
});
