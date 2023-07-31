import { BaseInstrumentation, VERSION } from '@grafana/faro-core';

export class XHRInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-xhr';
  readonly version = VERSION;

  initialize(): void {
    console.log('Initializing XHR instrumentation')
  }
}
