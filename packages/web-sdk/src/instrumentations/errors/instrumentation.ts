import { BaseInstrumentation, VERSION } from '@grafana/faro-core';

import { registerOnerror } from './registerOnerror';
import { registerOnunhandledrejection } from './registerOnunhandledrejection';

import type { ErrorInstrumentationOptions } from './types';

export class ErrorsInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-errors';
  readonly version = VERSION;

  constructor(private readonly options: ErrorInstrumentationOptions = {}) {
    super();
  }

  initialize(): void {
    this.logDebug('Initializing');

    registerOnerror(this.api);

    registerOnunhandledrejection(this.api, this.options);
  }
}
