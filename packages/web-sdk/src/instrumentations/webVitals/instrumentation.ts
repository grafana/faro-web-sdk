import { BaseInstrumentation, VERSION } from '@grafana/faro-core';

import { WebVitalsBasic } from './webVitalsBasic';
import { WebVitalsWithAttribution } from './webVitalsWithAttribution';

export class WebVitalsInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-web-vitals'
  readonly version = VERSION

  initialize(): void {
    this.logDebug('Initializing');
    const webVitals = this.createWebVitals();
    webVitals.initialize();
  }

  private createWebVitals() {
    if (this.config.trackWebVitalAttribution) {
      return new WebVitalsWithAttribution(this.api.pushMeasurement)
    }
    return new WebVitalsBasic(this.api.pushMeasurement)
  }
}
