import type { Instrumentation } from '@grafana/agent-core';

import { registerOnerror } from './registerOnerror';
import { registerOnunhandledrejection } from './registerOnunhandledrejection';

export const errorsInstrumentation: Instrumentation = {
  initialize: () => {
    registerOnerror();
    registerOnunhandledrejection();
  },
  version: '1.0',
  name: 'errors',
};
