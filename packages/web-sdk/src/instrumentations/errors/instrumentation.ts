import { VERSION } from '@grafana/faro-core';

import { WebSdkBaseInstrumentation } from '../WebSdkBaseInstrumentation';

import { registerOnerror } from './registerOnerror';
import { registerOnunhandledrejection } from './registerOnunhandledrejection';

export class ErrorsInstrumentation extends WebSdkBaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-errors';
  readonly version = VERSION;

  initialize(): void {
    this.logDebug('Initializing');

    registerOnerror(this.api);

    registerOnunhandledrejection(this.api);
  }
}
