import type { Instrumentation } from '@grafana/agent-core';
import { VERSION } from '@grafana/agent-core';

import { registerOnerror } from './registerOnerror';
import { registerOnunhandledrejection } from './registerOnunhandledrejection';

export class ErrorsInstrumentation implements Instrumentation {
  initialize(): void {
    registerOnerror();
    registerOnunhandledrejection();
  }
  version = VERSION;
  name = '@grafana/agent-web:instrumentation-errors';
}
