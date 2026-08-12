const { getTsdownConfigBase } = require('../../tsdown.config.base.js');

module.exports = getTsdownConfigBase({
  bundleName: 'faro-react',
  globalName: 'GrafanaFaroReact',
  bundleExternals: {
    '@grafana/faro-web-sdk': 'GrafanaFaroWebSdk',
    '@grafana/faro-web-tracing': 'GrafanaFaroWebTracing',
    react: 'React',
    'react-dom': 'ReactDOM',
  },
  bundleInlines: ['hoist-non-react-statics'],
});
