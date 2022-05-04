import type { Instrumentation } from '@grafana/agent-core';
import { VERSION } from '@grafana/agent-core';

import { registerOnerror } from './registerOnerror';
import { registerOnunhandledrejection } from './registerOnunhandledrejection';

export const errorsInstrumentation: Instrumentation = {
  initialize: () => {
    registerOnerror();
    registerOnunhandledrejection();
  },
  version: VERSION,
  name: '@grafana/agent-instrumentation-errors',
};
