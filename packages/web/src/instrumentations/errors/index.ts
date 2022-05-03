import type { Instrumentation, VERSION } from '@grafana/agent-core';

import { registerOnerror } from './registerOnerror';
import { registerOnunhandledrejection } from './registerOnunhandledrejection';

export const errorsInstrumentation: Instrumentation = {
  initialize: () => {
    registerOnerror();
    registerOnunhandledrejection();
  },
  version: VERSION.CURRENT,
  name: '@grafana/agent-instrumentation-errors',
};
