import type { Instrumentation } from '@grafana/javascript-agent-core';

import { registerOnerror } from './registerOnerror';
import { registerOnunhandledrejection } from './registerOnunhandledrejection';

const errorsInstrumentation: Instrumentation = () => {
  registerOnerror();
  registerOnunhandledrejection();
};

export default errorsInstrumentation;
