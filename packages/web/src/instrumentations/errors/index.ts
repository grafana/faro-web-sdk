import { BaseInstrumentation, VERSION } from '@grafana/agent-core';

import { registerOnerror } from './registerOnerror';
import { registerOnunhandledrejection } from './registerOnunhandledrejection';

export class ErrorsInstrumentation extends BaseInstrumentation {
  initialize(): void {
    registerOnerror(this.agent);
    registerOnunhandledrejection(this.agent);
  }
  version = VERSION;
  name = '@grafana/agent-web:instrumentation-errors';
}
