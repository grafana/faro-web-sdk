import { BaseInstrumentation, VERSION } from '@grafana/faro-core';

import { registerOnerror } from './registerOnerror';
import { registerOnunhandledrejection } from './registerOnunhandledrejection';

export class ErrorsInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-errors';
  readonly version = VERSION;

  initialize(): void {
    this.logDebug('Initializing');

    registerOnerror(this.api);

    registerOnunhandledrejection(this.api);
  }
}
