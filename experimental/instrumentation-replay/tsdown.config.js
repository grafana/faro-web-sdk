import { getTsdownConfigBase } from '../../tsdown.config.base.js';

export default getTsdownConfigBase({
  bundleName: 'faro-instrumentation-replay',
  globalName: 'GrafanaFaroInstrumentationReplay',
  bundleInlines: [/^@grafana\/faro-core/, /^@grafana\/rrweb/],
});
