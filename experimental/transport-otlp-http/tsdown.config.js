import { getTsdownConfigBase } from '../../tsdown.config.base.js';

export default getTsdownConfigBase({
  bundleName: 'faro-transport-otlp-http',
  globalName: 'GrafanaFaroTransportOtlpHttp',
  bundleInlines: [/^@grafana\/faro-core/, /^@opentelemetry\//],
});
