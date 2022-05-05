import { BaseInstrumentation, VERSION } from '@grafana/agent-core';

import { registerOnerror } from './registerOnerror';
import { registerOnunhandledrejection } from './registerOnunhandledrejection';

export class ErrorsInstrumentation extends BaseInstrumentation {
  readonly version = VERSION;
  readonly name = '@grafana/agent-web:instrumentation-errors';

  initialize(): void {
    registerOnerror(this.agent);
    registerOnunhandledrejection(this.agent);
  }
}
