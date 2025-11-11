import { BaseInstrumentation, VERSION } from '@grafana/faro-core';

import { WebVitalsWithAttribution } from './webVitalsWithAttribution';

export class WebVitalsInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-web-vitals';
  readonly version = VERSION;

  initialize(): void {
    this.logDebug('Initializing');
    const webVitals = new WebVitalsWithAttribution(this.api.pushMeasurement, this.config.webVitalsInstrumentation);
    webVitals.initialize();
  }
}
