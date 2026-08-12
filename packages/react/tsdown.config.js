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
  // react-is is not a direct dependency. It is pulled in by hoist-non-react-statics and ends up in
  // the bundle with it, so it has to be listed here as well.
  bundleInlines: [/^hoist-non-react-statics/, /^react-is/],
});
