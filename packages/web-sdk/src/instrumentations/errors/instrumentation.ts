import { BaseInstrumentation, VERSION } from '@grafana/faro-core';

import { registerOnerror } from './registerOnerror';
import { registerOnunhandledrejection } from './registerOnunhandledrejection';

export class ErrorsInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:instrumentation-errors';
  readonly version: string = VERSION;
  private cleanupError: (() => void) | undefined;
  private cleanupRejection: (() => void) | undefined;

  initialize(): void {
    this.logDebug('Initializing');

    this.destroy();
    this.cleanupError = registerOnerror(this.api);

    this.cleanupRejection = registerOnunhandledrejection(this.api);
  }

  destroy(): void {
    this.cleanupError?.();
    this.cleanupRejection?.();
    this.cleanupError = undefined;
    this.cleanupRejection = undefined;
  }
}
