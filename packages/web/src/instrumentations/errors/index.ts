import type { Instrumentation } from '@grafana/agent-core';

import { registerOnerror } from './registerOnerror';
import { registerOnunhandledrejection } from './registerOnunhandledrejection';

export const errorsInstrumentation: Instrumentation = () => {
  registerOnerror();
  registerOnunhandledrejection();
};
