import { agent } from '@grafana/javascript-agent-core';
import type { Instrumentation } from '@grafana/javascript-agent-core';

const tracingInstrumentation: Instrumentation = () => {
  agent.api.pushLog(['A simple log from the tracing instrumentation package']);
};

export default tracingInstrumentation;
