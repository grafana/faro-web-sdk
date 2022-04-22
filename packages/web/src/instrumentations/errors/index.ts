import type { Instrumentation } from '@grafana/agent-core';

import { registerOnerror } from './registerOnerror';
import { registerOnunhandledrejection } from './registerOnunhandledrejection';
import { VERSION } from './version';

export const errorsInstrumentation: Instrumentation = {
  initialize: () => {
    registerOnerror();
    registerOnunhandledrejection();
  },
  version: VERSION,
  name: '@grafana/agent-instrumentation-errors',
};
