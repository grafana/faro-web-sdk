import { BaseInstrumentation, VERSION } from '@grafana/agent-core';

import { registerOnerror } from './registerOnerror';
import { registerOnunhandledrejection } from './registerOnunhandledrejection';

export { parseStacktrace } from './stackFrames';

export class ErrorsInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/agent-web:instrumentation-errors';
  readonly version = VERSION;

  initialize(): void {
    this.logDebug('Initializing...');

    registerOnerror(this.agent);

    registerOnunhandledrejection(this.agent);
  }
}
